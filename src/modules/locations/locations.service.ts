import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ============ DEPARTMENTS ============
  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAllDepartments() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { municipalities: true } },
      },
    });
  }

  async findDepartmentById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { municipalities: { where: { isActive: true } } },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async updateDepartment(id: string, dto: Partial<CreateDepartmentDto>) {
    await this.findDepartmentById(id);

    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  async removeDepartment(id: string) {
    await this.findDepartmentById(id);

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============ MUNICIPALITIES ============
  async createMunicipality(dto: CreateMunicipalityDto) {
    // Check department exists
    await this.findDepartmentById(dto.departmentId);

    const existing = await this.prisma.municipality.findFirst({
      where: { name: dto.name, departmentId: dto.departmentId },
    });

    if (existing) {
      throw new ConflictException(
        `Municipality "${dto.name}" already exists in this department`,
      );
    }

    return this.prisma.municipality.create({
      data: {
        name: dto.name,
        departmentId: dto.departmentId,
        isActive: dto.isActive ?? true,
      },
      include: { department: true },
    });
  }

  async findAllMunicipalities(departmentId?: string) {
    return this.prisma.municipality.findMany({
      where: {
        isActive: true,
        ...(departmentId && { departmentId }),
      },
      orderBy: { name: 'asc' },
      include: { department: true },
    });
  }

  async findMunicipalityById(id: string) {
    const municipality = await this.prisma.municipality.findUnique({
      where: { id },
      include: { department: true, locations: { where: { isActive: true } } },
    });

    if (!municipality) {
      throw new NotFoundException(`Municipality with ID ${id} not found`);
    }

    return municipality;
  }

  async updateMunicipality(id: string, dto: Partial<CreateMunicipalityDto>) {
    await this.findMunicipalityById(id);

    return this.prisma.municipality.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }

  async removeMunicipality(id: string) {
    await this.findMunicipalityById(id);

    return this.prisma.municipality.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============ LOCATION TYPES ============
  async createLocationType(name: string) {
    const existing = await this.prisma.locationType.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException(`Location type "${name}" already exists`);
    }

    return this.prisma.locationType.create({
      data: { name },
    });
  }

  async findAllLocationTypes() {
    return this.prisma.locationType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============ LOCATIONS ============
  async createLocation(dto: CreateLocationDto) {
    return this.prisma.location.create({
      data: {
        name: dto.name,
        locationTypeId: dto.locationTypeId,
        municipalityId: dto.municipalityId,
        waterBody: dto.waterBody,
        isActive: dto.isActive ?? true,
      },
      include: {
        locationType: true,
        municipality: { include: { department: true } },
      },
    });
  }

  async findAllLocations(municipalityId?: string) {
    return this.prisma.location.findMany({
      where: {
        isActive: true,
        ...(municipalityId && { municipalityId }),
      },
      orderBy: { name: 'asc' },
      include: {
        locationType: true,
        municipality: { include: { department: true } },
      },
    });
  }

  async findLocationById(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        locationType: true,
        municipality: { include: { department: true } },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async updateLocation(id: string, dto: Partial<CreateLocationDto>) {
    await this.findLocationById(id);

    return this.prisma.location.update({
      where: { id },
      data: dto,
      include: {
        locationType: true,
        municipality: { include: { department: true } },
      },
    });
  }

  async removeLocation(id: string) {
    await this.findLocationById(id);

    return this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
