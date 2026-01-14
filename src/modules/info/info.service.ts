import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInfoDto, UpdateInfoDto } from './dto/update-info.dto';

@Injectable()
export class InfoService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.systemInfo.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string) {
    const info = await this.prisma.systemInfo.findUnique({
      where: { key },
    });

    if (!info) {
      throw new NotFoundException(`Information with key '${key}' not found`);
    }

    return info;
  }

  async create(dto: CreateInfoDto) {
    return this.prisma.systemInfo.create({
      data: {
        key: dto.key,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  async update(key: string, dto: UpdateInfoDto) {
    await this.findByKey(key);

    return this.prisma.systemInfo.update({
      where: { key },
      data: {
        ...(dto.title && { title: dto.title }),
        content: dto.content,
      },
    });
  }

  async remove(key: string) {
    await this.findByKey(key);

    return this.prisma.systemInfo.update({
      where: { key },
      data: { isActive: false },
    });
  }
}
