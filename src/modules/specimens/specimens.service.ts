import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { publicUserSelect } from '../../common/prisma/user-select';
import {
  normalizeTaxonLevel,
  taxonomyInclude,
  taxonomySearch,
  taxonomyWhere,
} from '../../common/prisma/taxonomy';
import { ImagesService } from '../images/images.service';
import { CreateSpecimenDto } from './dto/create-specimen.dto';
import { SearchSpecimenDto } from './dto/search-specimen.dto';
import { UpdateSpecimenDto } from './dto/update-specimen.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SpecimensService {
  constructor(
    private prisma: PrismaService,
    private imagesService: ImagesService,
  ) {}

  private readonly includeRelations = {
    ...taxonomyInclude,
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
      include: { user: { select: publicUserSelect } },
    },
    comments: {
      include: { user: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' as const },
    },
    images: {
      where: { isActive: true },
      orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    },
    createdBy: { select: publicUserSelect },
    updatedBy: { select: publicUserSelect },
  };

  /**
   * Generate next catalog number (e.g., HUAZ-000001)
   */
  private async generateCatalogNumber(): Promise<string> {
    // Incremento atómico en la base: dos creaciones simultáneas no reciben el mismo número.
    // Se saltan números ya usados (p. ej. escritos a mano en el formulario).
    for (let attempt = 0; attempt < 1000; attempt++) {
      const counter = await this.prisma.catalogCounter.upsert({
        where: { prefix: 'HUAZ' },
        update: { lastNumber: { increment: 1 } },
        create: { prefix: 'HUAZ', lastNumber: 1 },
      });
      const candidate = `HUAZ-${String(counter.lastNumber).padStart(6, '0')}`;
      const taken = await this.prisma.specimen.findUnique({
        where: { catalogNumber: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new BadRequestException(
      'No se pudo generar un número de catálogo disponible',
    );
  }

  /**
   * @param userId usuario que crea la muestra (queda como createdBy y updatedBy)
   */
  async create(dto: CreateSpecimenDto, userId?: string) {
    const { collectorIds, collectionDate, latitude, longitude, ...data } = dto;

    // Generate catalog number if not provided
    const catalogNumber =
      dto.catalogNumber || (await this.generateCatalogNumber());

    let specimen;
    try {
      specimen = await this.prisma.specimen.create({
        data: {
          ...normalizeTaxonLevel(data),
          catalogNumber,
          collectionDate: collectionDate ? new Date(collectionDate) : null,
          collectionYear: collectionDate
            ? new Date(collectionDate).getUTCFullYear()
            : null,
          latitude: latitude != null ? new Decimal(latitude) : null,
          longitude: longitude != null ? new Decimal(longitude) : null,
          isActive: dto.isActive ?? true,
          createdById: userId ?? null,
          updatedById: userId ?? null,
        },
        include: this.includeRelations,
      });
    } catch (error: any) {
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('catalogNumber')
      ) {
        throw new BadRequestException(
          `El número de catálogo '${catalogNumber}' ya existe. Por favor usa uno diferente.`,
        );
      }
      throw error;
    }

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
      search,
      scientificName,
      commonName,
      catalogNumber,
      classId,
      orderId,
      familyId,
      genusId,
      speciesId,
      divisionId,
      departmentId,
      municipalityId,
      locationId,
      projectId,
      collectorId,
      startDate,
      endDate,
      isActive,
      hasImages,
      source,
      taxonLevel,
      sort = 'recent',
    } = searchDto;

    const and: Prisma.SpecimenWhereInput[] = [];

    if (isActive !== undefined) and.push({ isActive });
    if (hasImages) {
      and.push(hasImages === 'true' ? { images: { some: {} } } : { images: { none: {} } });
    }
    if (source) and.push({ source });
    if (taxonLevel === 'species') and.push({ speciesId: { not: null } });
    if (taxonLevel === 'genus') and.push({ speciesId: null, genusId: { not: null } });
    if (taxonLevel === 'family') and.push({ speciesId: null, genusId: null, familyId: { not: null } });
    if (taxonLevel === 'none') and.push({ speciesId: null, genusId: null, familyId: null });

    // Búsqueda general: nombres, catálogo y taxonomía
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      and.push({
        OR: [
          { scientificName: contains },
          { commonName: contains },
          { catalogNumber: contains },
          ...taxonomySearch(contains),
        ],
      });
    }

    if (scientificName) {
      and.push({
        scientificName: { contains: scientificName, mode: 'insensitive' },
      });
    }
    if (commonName) {
      and.push({ commonName: { contains: commonName, mode: 'insensitive' } });
    }
    if (catalogNumber) {
      and.push({
        catalogNumber: { contains: catalogNumber, mode: 'insensitive' },
      });
    }

    // Taxonomía: la muestra se liga a especie, género o familia; un filtro incluye los niveles inferiores
    if (speciesId) and.push(taxonomyWhere('species', speciesId));
    if (genusId) and.push(taxonomyWhere('genus', genusId));
    if (familyId) and.push(taxonomyWhere('family', familyId));
    if (orderId) and.push(taxonomyWhere('order', orderId));
    if (classId) and.push(taxonomyWhere('class', classId));
    if (divisionId) and.push(taxonomyWhere('division', divisionId));

    // Ubicación: Departamento → Municipio → Ubicación
    if (locationId) and.push({ locationId });
    if (municipalityId) and.push({ location: { municipalityId } });
    if (departmentId)
      and.push({ location: { municipality: { departmentId } } });

    if (projectId) and.push({ projectId });
    if (collectorId)
      and.push({ collectors: { some: { userId: collectorId } } });

    // Rango de fechas de colecta (endDate incluye todo el día)
    if (startDate || endDate) {
      const collectionDate: Prisma.DateTimeNullableFilter = {};
      if (startDate) collectionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        collectionDate.lte = end;
      }
      and.push({ collectionDate });
    }

    const where: Prisma.SpecimenWhereInput = and.length ? { AND: and } : {};

    const orderBy: Prisma.SpecimenOrderByWithRelationInput[] =
      sort === 'name'
        ? [{ scientificName: 'asc' }]
        : sort === 'collectionDate'
          ? [{ collectionDate: { sort: 'desc', nulls: 'last' } }]
          : [{ createdAt: 'desc' }];

    // El listado no necesita comentarios; la ficha (findOne) sí los trae
    const { comments: _comments, ...listInclude } = this.includeRelations;

    const [specimens, total] = await Promise.all([
      this.prisma.specimen.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: listInclude,
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

  /**
   * @param includeInactive false para consultas públicas: una muestra inactiva responde 404
   */
  async findOne(id: string, includeInactive = true) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!specimen || (!includeInactive && !specimen.isActive)) {
      throw new NotFoundException(`Specimen with ID ${id} not found`);
    }

    return specimen;
  }

  /**
   * @param userId usuario que edita (queda como updatedBy)
   */
  async update(id: string, dto: UpdateSpecimenDto, userId?: string) {
    await this.findOne(id);

    const { collectorIds, collectionDate, latitude, longitude, ...data } = dto;

    // undefined = no cambiar · null = limpiar el campo
    const toDecimal = (value: number | null | undefined) =>
      value === undefined
        ? undefined
        : value === null
          ? null
          : new Decimal(value);
    const date =
      collectionDate === undefined
        ? undefined
        : collectionDate
          ? new Date(collectionDate)
          : null;

    const specimen = await this.prisma.specimen.update({
      where: { id },
      data: {
        ...normalizeTaxonLevel(data),
        collectionDate: date,
        ...(date !== undefined && {
          collectionYear: date ? date.getUTCFullYear() : null,
        }),
        latitude: toDecimal(latitude),
        longitude: toDecimal(longitude),
        ...(userId && { updatedById: userId }),
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
    const specimen = await this.prisma.specimen.findUnique({
      where: { id },
    });

    if (!specimen) {
      throw new NotFoundException(`Specimen with ID ${id} not found`);
    }

    // Hard delete all associated images physically from disk
    const images = await this.prisma.specimenImage.findMany({
      where: { specimenId: id },
    });

    for (const img of images) {
      try {
        await this.imagesService.hardDeleteImage(img.id);
      } catch (error: any) {
        // Log explicitly because we don't want a single missing image file to stop the DB deletion
        console.error(
          `Error deleting image files for ${img.id}:`,
          error.message,
        );
      }
    }

    // Delete the specimen record completely.
    // Prisma's onDelete: Cascade will handle specimen_collectors, comments, etc!
    return this.prisma.specimen.delete({
      where: { id },
    });
  }

  async updateImage(id: string, imageId: string, userId?: string) {
    await this.findOne(id);

    return this.prisma.specimen.update({
      where: { id },
      data: { imageId, ...(userId && { updatedById: userId }) },
      include: this.includeRelations,
    });
  }

  async getCollectors(id: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id },
      include: {
        collectors: {
          include: { user: { select: publicUserSelect } },
        },
      },
    });

    if (!specimen) {
      throw new NotFoundException(`Specimen with ID ${id} not found`);
    }

    return specimen.collectors.map((c) => c.user);
  }

  /**
   * @param editorId usuario que hace el cambio (queda como updatedBy de la muestra)
   */
  async addCollector(specimenId: string, userId: string, editorId?: string) {
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
    await this.touchUpdatedBy(specimenId, editorId);

    return this.findOne(specimenId);
  }

  async removeCollector(specimenId: string, userId: string, editorId?: string) {
    await this.findOne(specimenId);

    await this.prisma.specimenCollector.delete({
      where: {
        specimenId_userId: { specimenId, userId },
      },
    });
    await this.touchUpdatedBy(specimenId, editorId);

    return this.findOne(specimenId);
  }

  /** Registra quién hizo el último cambio en la muestra */
  private async touchUpdatedBy(specimenId: string, userId?: string) {
    if (!userId) return;
    await this.prisma.specimen.update({
      where: { id: specimenId },
      data: { updatedById: userId },
    });
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
