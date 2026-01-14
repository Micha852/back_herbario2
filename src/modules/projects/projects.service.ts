import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Project "${dto.name}" already exists`);
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        effortDays: dto.effortDays ? parseInt(dto.effortDays as any, 10) : null,
        observation: dto.observation,
        protocolId: dto.protocolId,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
      include: { protocol: true },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.project.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        protocol: true,
        _count: { select: { specimens: true } },
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        protocol: true,
        specimens: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { specimens: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, dto: Partial<CreateProjectDto>) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.project.findFirst({
        where: { name: dto.name, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException(`Project "${dto.name}" already exists`);
      }
    }

    const { startDate, endDate, effortDays, ...rest } = dto;

    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        effortDays: effortDays ? parseInt(effortDays as any, 10) : undefined,
      },
      include: { protocol: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============ PROTOCOLS ============
  async createProtocol(name: string) {
    const existing = await this.prisma.protocol.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException(`Protocol "${name}" already exists`);
    }

    return this.prisma.protocol.create({
      data: { name },
    });
  }

  async findAllProtocols() {
    return this.prisma.protocol.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
