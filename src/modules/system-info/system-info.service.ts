import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ImagesService } from '../images/images.service';
import { UpdateSystemInfoDto } from './dto/update-system-info.dto';

/**
 * Páginas que el CMS puede crear la primera vez que se guardan (las demás vienen del seed).
 * key → título del registro.
 */
export const CREATABLE_PAGES: Record<string, string> = {
    inicio: 'Página de inicio (consultas)',
};

/** Campos del contenido que guardan ids de imágenes subidas, por página */
const IMAGE_FIELDS: Record<string, string[]> = {
    inicio: ['backgroundImageId', 'logoImageId', 'faviconImageId'],
};

/** Ids de imagen que usa un contenido (JSON) según IMAGE_FIELDS */
export function imageIdsIn(key: string, content: string | null | undefined): string[] {
    const fields = IMAGE_FIELDS[key];
    if (!fields || !content) return [];
    try {
        const data = JSON.parse(content) as Record<string, unknown>;
        return fields.map((f) => data[f]).filter((v): v is string => typeof v === 'string' && v.length > 0);
    } catch {
        return [];
    }
}

@Injectable()
export class SystemInfoService {
    private readonly logger = new Logger(SystemInfoService.name);

    constructor(
        private prisma: PrismaService,
        private images: ImagesService,
    ) { }

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
        // Las páginas creables se crean al guardarlas por primera vez; el resto debe existir
        const exists = await this.prisma.systemInfo.findUnique({ where: { key } });
        if (!exists && !CREATABLE_PAGES[key]) await this.findByKey(key);

        // Validar que content sea JSON válido
        try {
            JSON.parse(updateDto.content);
        } catch (error) {
            throw new BadRequestException('Invalid JSON content');
        }

        const saved = await this.prisma.systemInfo.upsert({
            where: { key },
            update: { content: updateDto.content, updatedAt: new Date() },
            create: { key, title: CREATABLE_PAGES[key], content: updateDto.content, isActive: true },
        });

        // Imágenes reemplazadas (p. ej. el fondo anterior): se borran definitivamente
        const stillUsed = new Set(imageIdsIn(key, updateDto.content));
        const replaced = imageIdsIn(key, exists?.content).filter((id) => !stillUsed.has(id));
        await this.deleteSiteImages(replaced);

        return saved;
    }

    /** Borra imágenes del sitio que ya no se usan (nunca las de una muestra) */
    private async deleteSiteImages(ids: string[]) {
        for (const id of ids) {
            try {
                const image = await this.prisma.specimenImage.findUnique({
                    where: { id },
                    select: { specimenId: true },
                });
                if (image && !image.specimenId) await this.images.deleteImage(id);
            } catch (error) {
                // No impide guardar: como mucho queda un archivo huérfano
                this.logger.warn(`No se pudo borrar la imagen ${id}: ${(error as Error).message}`);
            }
        }
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
