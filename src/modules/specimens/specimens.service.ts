import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSpecimenDto } from './dto/create-specimen.dto';
import { SearchSpecimenDto } from './dto/search-specimen.dto';

@Injectable()
export class SpecimensService {
  constructor(private prisma: PrismaService) {}

  private readonly includeRelations = {
    class: true,
    order: true,
    family: true,
    genus: true,
    species: true,
    division: true,
    location: {
      include: {
        municipality: {
          include: { department: true },
        },
        locationType: true,
      },
    },
    venationType: true,
    formType: true,
    marginType: true,
    origin: true,
    project: true,
    condition: true,
    originType: true,
    habitat: true,
    collectors: {
      include: { user: true },
    },
    comments: {
      include: { user: true },
      orderBy: { createdAt: 'desc' as const },
    },
  };

  async create(dto: CreateSpecimenDto) {
    const { collectorIds, collectionDate, ...data } = dto;

    const specimen = await this.prisma.specimen.create({
      data: {
        ...data,
        collectionDate: collectionDate ? new Date(collectionDate) : null,
        isActive: dto.isActive ?? true,
      },
      include: this.includeRelations,
    });

    // Assign collectors if provided
    if (collectorIds && collectorIds.length > 0) {
      await this.prisma.specimenCollector.createMany({
        data: collectorIds.map((userId) => ({
          specimenId: specimen.id,
          userId,
        })),
      });

      return this.findOne(specimen.id);
    }

    return specimen;
  }

  async findAll(searchDto: SearchSpecimenDto) {
    const {
      page = 1,
      limit = 20,
      scientificName,
      commonName,
      classId,
      orderId,
      familyId,
      genusId,
      speciesId,
      divisionId,
      projectId,
      locationId,
      collectorId,
    } = searchDto;

    const where: any = {
      isActive: true,
    };

    if (scientificName) {
      where.scientificName = {
        contains: scientificName,
        mode: 'insensitive',
      };
    }

    if (commonName) {
      where.commonName = {
        contains: commonName,
        mode: 'insensitive',
      };
    }

    if (classId) where.classId = classId;
    if (orderId) where.orderId = orderId;
    if (familyId) where.familyId = familyId;
    if (genusId) where.genusId = genusId;
    if (speciesId) where.speciesId = speciesId;
    if (divisionId) where.divisionId = divisionId;
    if (projectId) where.projectId = projectId;
    if (locationId) where.locationId = locationId;

    if (collectorId) {
      where.collectors = {
        some: { userId: collectorId },
      };
    }

    const [specimens, total] = await Promise.all([
      this.prisma.specimen.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations,
      }),
      this.prisma.specimen.count({ where }),
    ]);

    return {
      data: specimens,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!specimen) {
      throw new NotFoundException(`Specimen with ID ${id} not found`);
    }

    return specimen;
  }

  async update(id: string, dto: Partial<CreateSpecimenDto>) {
    await this.findOne(id);

    const { collectorIds, collectionDate, ...data } = dto;

    const specimen = await this.prisma.specimen.update({
      where: { id },
      data: {
        ...data,
        collectionDate: collectionDate ? new Date(collectionDate) : undefined,
      },
      include: this.includeRelations,
    });

    // Update collectors if provided
    if (collectorIds !== undefined) {
      // Remove existing collectors
      await this.prisma.specimenCollector.deleteMany({
        where: { specimenId: id },
      });

      // Add new collectors
      if (collectorIds.length > 0) {
        await this.prisma.specimenCollector.createMany({
          data: collectorIds.map((userId) => ({
            specimenId: id,
            userId,
          })),
        });
      }

      return this.findOne(id);
    }

    return specimen;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.specimen.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updateImage(id: string, imageId: string) {
    await this.findOne(id);

    return this.prisma.specimen.update({
      where: { id },
      data: { imageId },
      include: this.includeRelations,
    });
  }

  async getCollectors(id: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id },
      include: {
        collectors: {
          include: { user: true },
        },
      },
    });

    if (!specimen) {
      throw new NotFoundException(`Specimen with ID ${id} not found`);
    }

    return specimen.collectors.map((c) => c.user);
  }

  async addCollector(specimenId: string, userId: string) {
    await this.findOne(specimenId);

    // Check if collector already exists
    const existing = await this.prisma.specimenCollector.findUnique({
      where: {
        specimenId_userId: { specimenId, userId },
      },
    });

    if (existing) {
      return this.findOne(specimenId);
    }

    await this.prisma.specimenCollector.create({
      data: { specimenId, userId },
    });

    return this.findOne(specimenId);
  }

  async removeCollector(specimenId: string, userId: string) {
    await this.findOne(specimenId);

    await this.prisma.specimenCollector.delete({
      where: {
        specimenId_userId: { specimenId, userId },
      },
    });

    return this.findOne(specimenId);
  }

  // ============ REFERENCE DATA ============
  async getOrigins() {
    return this.prisma.origin.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getConditions() {
    return this.prisma.condition.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getOriginTypes() {
    return this.prisma.originType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getHabitats() {
    return this.prisma.habitat.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createOrigin(name: string) {
    return this.prisma.origin.create({ data: { name } });
  }

  async createCondition(name: string) {
    return this.prisma.condition.create({ data: { name } });
  }

  async createOriginType(name: string) {
    return this.prisma.originType.create({ data: { name } });
  }

  async createHabitat(name: string) {
    return this.prisma.habitat.create({ data: { name } });
  }
}
