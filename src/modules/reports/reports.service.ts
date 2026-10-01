import { Injectable } from '@nestjs/common';
import { publicUserSelect } from '../../common/prisma/user-select';
import { taxonomyInclude } from '../../common/prisma/taxonomy';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { hasPermission } from '../permissions/permissions.logic';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Resumen para el dashboard del panel, según lo que el usuario puede ver:
   * las muestras inactivas solo cuentan con el permiso specimens.status.
   */
  async getDashboard(user: { id: string; permissions?: string[] }) {
    const canSeeInactive = hasPermission(user.permissions, PERMISSIONS.SPECIMENS_STATUS);
    const visible: Prisma.SpecimenWhereInput = canSeeInactive ? {} : { isActive: true };
    const visibleComments: Prisma.CommentWhereInput = canSeeInactive ? {} : { specimen: { isActive: true } };

    const [
      total,
      active,
      inactive,
      mine,
      withoutImages,
      projects,
      collectors,
      comments,
      recentSpecimens,
      recentComments,
    ] = await Promise.all([
      this.prisma.specimen.count({ where: visible }),
      this.prisma.specimen.count({ where: { isActive: true } }),
      canSeeInactive ? this.prisma.specimen.count({ where: { isActive: false } }) : Promise.resolve(null),
      this.prisma.specimen.count({ where: { ...visible, createdById: user.id } }),
      this.prisma.specimen.count({
        where: { ...visible, images: { none: { isActive: true } } },
      }),
      this.prisma.project.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, isCollector: true } }),
      this.prisma.comment.count({ where: visibleComments }),
      this.prisma.specimen.findMany({
        where: visible,
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          scientificName: true,
          commonName: true,
          catalogNumber: true,
          isActive: true,
          createdAt: true,
          createdBy: { select: publicUserSelect },
          images: {
            where: { isActive: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: visibleComments,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          text: true,
          createdAt: true,
          user: { select: publicUserSelect },
          specimen: { select: { id: true, scientificName: true } },
        },
      }),
    ]);

    return {
      specimens: { total, active, inactive, mine, withoutImages },
      projects,
      collectors,
      comments,
      recentSpecimens: recentSpecimens.map(({ images, ...specimen }) => ({
        ...specimen,
        primaryImageId: images[0]?.id ?? null,
      })),
      recentComments,
    };
  }

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
        ...taxonomyInclude,
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
