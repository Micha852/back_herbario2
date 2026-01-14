import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomyType } from './enums/taxonomy-type.enum';

@Injectable()
export class TaxonomyService {
  constructor(private prisma: PrismaService) {}

  private getModel(type: TaxonomyType) {
    const models = {
      [TaxonomyType.CLASS]: this.prisma.class,
      [TaxonomyType.ORDER]: this.prisma.order,
      [TaxonomyType.FAMILY]: this.prisma.family,
      [TaxonomyType.GENUS]: this.prisma.genus,
      [TaxonomyType.SPECIES]: this.prisma.species,
      [TaxonomyType.DIVISION]: this.prisma.division,
      [TaxonomyType.VENATION_TYPE]: this.prisma.venationType,
      [TaxonomyType.FORM_TYPE]: this.prisma.formType,
      [TaxonomyType.MARGIN_TYPE]: this.prisma.marginType,
    };

    const model = models[type];
    if (!model) {
      throw new BadRequestException(`Invalid taxonomy type: ${type}`);
    }
    return model;
  }

  async create(type: TaxonomyType, dto: CreateTaxonomyDto) {
    const model = this.getModel(type) as any;

    // Check if already exists
    const existing = await model.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`${type} with name "${dto.name}" already exists`);
    }

    return model.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(type: TaxonomyType, includeInactive = false) {
    const model = this.getModel(type) as any;

    return model.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(type: TaxonomyType, id: string) {
    const model = this.getModel(type) as any;

    const item = await model.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }

    return item;
  }

  async update(type: TaxonomyType, id: string, dto: UpdateTaxonomyDto) {
    await this.findOne(type, id);

    const model = this.getModel(type) as any;

    // Check if new name already exists (if changing name)
    if (dto.name) {
      const existing = await model.findFirst({
        where: {
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`${type} with name "${dto.name}" already exists`);
      }
    }

    return model.update({
      where: { id },
      data: dto,
    });
  }

  async remove(type: TaxonomyType, id: string) {
    await this.findOne(type, id);

    const model = this.getModel(type) as any;

    // Soft delete
    return model.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Convenience methods for each type
  async getClasses() {
    return this.findAll(TaxonomyType.CLASS);
  }

  async getOrders() {
    return this.findAll(TaxonomyType.ORDER);
  }

  async getFamilies() {
    return this.findAll(TaxonomyType.FAMILY);
  }

  async getGenera() {
    return this.findAll(TaxonomyType.GENUS);
  }

  async getSpecies() {
    return this.findAll(TaxonomyType.SPECIES);
  }

  async getDivisions() {
    return this.findAll(TaxonomyType.DIVISION);
  }

  async getVenationTypes() {
    return this.findAll(TaxonomyType.VENATION_TYPE);
  }

  async getFormTypes() {
    return this.findAll(TaxonomyType.FORM_TYPE);
  }

  async getMarginTypes() {
    return this.findAll(TaxonomyType.MARGIN_TYPE);
  }
}
