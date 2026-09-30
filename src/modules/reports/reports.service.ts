import { Injectable } from '@nestjs/common';
import { publicUserSelect } from '../../common/prisma/user-select';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Get specimens by collector (for reports)
   */
  async getSpecimensByCollector(collectorId: string) {
    const collector = await this.prisma.user.findUnique({
      where: { id: collectorId },
      select: { ...publicUserSelect, email: true, isCollector: true },
    });

    const specimens = await this.prisma.specimen.findMany({
      where: {
        isActive: true,
        collectors: { some: { userId: collectorId } },
      },
      include: {
        species: {
          include: {
            genus: {
              include: {
                family: {
                  include: {
                    order: {
                      include: {
                        class: {
                          include: {
                            division: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        location: {
          include: {
            municipality: { include: { department: true } },
          },
        },
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      collector,
      specimens,
      totalSpecimens: specimens.length,
    };
  }

  /**
   * Get Darwin Core format data
   */
  async getDarwinCoreData(startDate?: string, endDate?: string) {
    const where: any = { isActive: true };

    if (startDate || endDate) {
      where.collectionDate = {};
      if (startDate) where.collectionDate.gte = new Date(startDate);
      if (endDate) where.collectionDate.lte = new Date(endDate);
    }

    const specimens = await this.prisma.specimen.findMany({
      where,
      include: {
        species: {
          include: {
            genus: {
              include: {
                family: {
                  include: {
                    order: {
                      include: {
                        class: {
                          include: {
                            division: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        location: {
          include: {
            municipality: { include: { department: true } },
          },
        },
        collectors: { include: { user: { select: publicUserSelect } } },
      },
    });

    // Transform to Darwin Core format
    return specimens.map((s) => ({
      occurrenceID: s.id,
      catalogNumber: s.catalogNumber,
      scientificName: s.scientificName,
      vernacularName: s.commonName,
      class: s.species?.genus?.family?.order?.class?.name,
      order: s.species?.genus?.family?.order?.name,
      family: s.species?.genus?.family?.name,
      genus: s.species?.genus?.name,
      specificEpithet: s.species?.epithet,
      eventDate: s.collectionDate?.toISOString().split('T')[0],
      decimalLatitude: s.latitude?.toString(),
      decimalLongitude: s.longitude?.toString(),
      verbatimElevation: s.altitude,
      country: 'Colombia',
      stateProvince: s.location?.municipality?.department?.name,
      municipality: s.location?.municipality?.name,
      locality: s.location?.name,
      recordedBy: s.collectors?.map((c) => c.user.name).join('; '),
      identifiedBy: s.author,
      occurrenceRemarks: s.localObservation,
    }));
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics() {
    const [
      totalSpecimens,
      totalUsers,
      totalProjects,
      specimensByFamily,
      specimensByDepartment,
      recentSpecimens,
    ] = await Promise.all([
      this.prisma.specimen.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.project.count({ where: { isActive: true } }),
      // TODO: Fix this query - Specimen doesn't have direct familyId
      // this.prisma.specimen.groupBy({
      //   by: ['familyId'],
      //   where: { isActive: true, familyId: { not: null } },
      //   _count: true,
      //   orderBy: { _count: { familyId: 'desc' } },
      //   take: 10,
      // }),
      Promise.resolve([]),
      this.prisma.specimen.findMany({
        where: {
          isActive: true,
          location: { isNot: null },
        },
        select: {
          location: {
            select: {
              municipality: {
                select: {
                  department: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.specimen.findMany({
        where: { isActive: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          scientificName: true,
          commonName: true,
          createdAt: true,
        },
      }),
    ]);

    // Process department counts
    const departmentCounts: Record<string, number> = {};
    specimensByDepartment.forEach((s) => {
      const dept = s.location?.municipality?.department?.name;
      if (dept) {
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      }
    });

    return {
      totalSpecimens,
      totalUsers,
      totalProjects,
      specimensByFamily,
      specimensByDepartment: Object.entries(departmentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentSpecimens,
    };
  }
}
