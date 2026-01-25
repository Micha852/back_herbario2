import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSystemInfoDto } from './dto/update-system-info.dto';

@Injectable()
export class SystemInfoService {
    constructor(private prisma: PrismaService) { }

    /**
     * Obtiene un registro de SystemInfo por su key
     */
    async findByKey(key: string) {
        const systemInfo = await this.prisma.systemInfo.findUnique({
            where: { key },
        });

        if (!systemInfo || !systemInfo.isActive) {
            throw new NotFoundException(`System info with key "${key}" not found`);
        }

        return systemInfo;
    }

    /**
     * Obtiene todos los registros activos de SystemInfo
     */
    async findAll() {
        return this.prisma.systemInfo.findMany({
            where: { isActive: true },
            orderBy: { key: 'asc' },
        });
    }

    /**
     * Actualiza el contenido de un registro de SystemInfo
     */
    async update(key: string, updateDto: UpdateSystemInfoDto) {
        // Validar que el registro existe
        await this.findByKey(key);

        // Validar que content sea JSON válido
        try {
            JSON.parse(updateDto.content);
        } catch (error) {
            throw new BadRequestException('Invalid JSON content');
        }

        return this.prisma.systemInfo.update({
            where: { key },
            data: {
                content: updateDto.content,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Activa o desactiva un registro de SystemInfo
     */
    async toggleActive(key: string, isActive: boolean) {
        await this.findByKey(key);

        return this.prisma.systemInfo.update({
            where: { key },
            data: { isActive },
        });
    }
}
