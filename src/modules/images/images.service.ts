import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LocalStorageService } from './storage/local-storage.service';
import { ImageProcessingService } from './processors/image-processing.service';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { TransformImageDto } from './dto/transform-image.dto';
import { MAX_IMAGES_PER_SPECIMEN, UpdateImageDto } from './dto/update-image.dto';

export interface ImageVersions {
  original: { path: string; size: number; width?: number; height?: number };
  thumbnail?: { path: string; size: number; width?: number; height?: number };
  medium?: { path: string; size: number; width?: number; height?: number };
  large?: { path: string; size: number; width?: number; height?: number };
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: LocalStorageService,
    private processingService: ImageProcessingService,
  ) {}

  /**
   * Upload image with multiple versions (Cloudinary-like service)
   */
  async uploadImage(
    file: Express.Multer.File,
    specimenId: string | undefined,
    uploadedBy: string,
    imageType: string = 'general',
    caption?: string,
  ): Promise<UploadImageResponseDto> {
    // Validaciones de la muestra antes de procesar el archivo
    let isPrimary = false;
    let sortOrder = 0;
    if (specimenId) {
      const specimen = await this.prisma.specimen.findUnique({ where: { id: specimenId } });
      if (!specimen) {
        throw new NotFoundException(`Specimen with ID ${specimenId} not found`);
      }
      // El límite cuenta también las inhabilitadas (siguen ocupando espacio)
      const totalImages = await this.prisma.specimenImage.count({ where: { specimenId } });
      if (totalImages >= MAX_IMAGES_PER_SPECIMEN) {
        throw new BadRequestException(
          `Una muestra puede tener como máximo ${MAX_IMAGES_PER_SPECIMEN} imágenes`,
        );
      }
      // Queda como principal si la muestra no tiene una principal activa
      const activePrimary = await this.prisma.specimenImage.count({
        where: { specimenId, isActive: true, isPrimary: true },
      });
      isPrimary = activePrimary === 0;
      sortOrder = totalImages;
    }

    try {
      // Validate image
      const isValid = await this.processingService.validateImage(file.buffer);
      if (!isValid) {
        throw new BadRequestException('Invalid image file');
      }

      // Get original metadata
      const metadata = await this.processingService.getMetadata(file.buffer);

      // Generate multiple versions
      const versions = await this.processingService.generateVersions(file.buffer);

      // Save all versions to disk
      const savedVersions = await this.storageService.saveMultipleVersions(
        versions,
        file.originalname,
      );

      // Save metadata to PostgreSQL
      const image = await this.prisma.specimenImage.create({
        data: {
          specimenId: specimenId || null,
          fileName: savedVersions.original.filename,
          originalName: file.originalname,
          filePath: savedVersions.original.path,
          mimeType: file.mimetype,
          size: file.size,
          width: metadata.width,
          height: metadata.height,
          thumbnailPath: savedVersions.thumbnail?.path || null,
          mediumPath: savedVersions.medium?.path || null,
          largePath: savedVersions.large?.path || null,
          imageType,
          caption: caption?.trim() || null,
          sortOrder,
          isPrimary,
          isActive: true,
        },
      });

      if (specimenId) {
        await this.prisma.specimen.update({
          where: { id: specimenId },
          data: { updatedById: uploadedBy },
        });
      }

      this.logger.log(`Image uploaded: ${image.id} (${versions.size} versions)`);

      return {
        id: image.id,
        versions: {
          original: {
            path: `/images/${image.id}`,
            size: file.size,
            width: metadata.width,
            height: metadata.height,
          },
          thumbnail: savedVersions.thumbnail
            ? {
                path: `/images/${image.id}?version=thumbnail`,
                size: savedVersions.thumbnail.size,
              }
            : undefined,
          medium: savedVersions.medium
            ? {
                path: `/images/${image.id}?version=medium`,
                size: savedVersions.medium.size,
              }
            : undefined,
          large: savedVersions.large
            ? {
                path: `/images/${image.id}?version=large`,
                size: savedVersions.large.size,
              }
            : undefined,
        },
        originalName: file.originalname,
        mimeType: file.mimetype,
        uploadedAt: image.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get image metadata by ID.
   * isActive=false significa "inhabilitada" (oculta al público, el archivo existe),
   * así que también se devuelve: el equipo la sigue viendo en el gestor.
   */
  async getImage(id: string) {
    const image = await this.prisma.specimenImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  /**
   * Get image file with optional transformations (Cloudinary-like)
   * This is the core of the local Cloudinary service
   */
  async getImageFile(
    id: string,
    version: 'original' | 'thumbnail' | 'medium' | 'large' = 'original',
    transformations?: TransformImageDto,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const image = await this.getImage(id);

    // Determine which path to use based on version
    let filePath: string;
    switch (version) {
      case 'thumbnail':
        filePath = image.thumbnailPath || image.filePath;
        break;
      case 'medium':
        filePath = image.mediumPath || image.filePath;
        break;
      case 'large':
        filePath = image.largePath || image.filePath;
        break;
      default:
        filePath = image.filePath;
    }

    // Read file from disk
    let buffer = await this.storageService.getFile(filePath);

    // Apply on-the-fly transformations if requested (like Cloudinary)
    if (transformations && this.hasTransformations(transformations)) {
      buffer = await this.processingService.transform(buffer, transformations);
    }

    // Determine MIME type
    const format = transformations?.format || 'webp';
    const mimeType = `image/${format}`;

    return { buffer, mimeType };
  }

  /**
   * Check if transformations object has any actual transformations
   */
  private hasTransformations(transformations: TransformImageDto): boolean {
    return !!(
      transformations.width ||
      transformations.height ||
      transformations.quality ||
      transformations.format ||
      transformations.crop
    );
  }

  /**
   * Eliminar imagen de una muestra: borra archivos y registro (hard delete).
   * Si era la principal, la siguiente imagen activa pasa a serlo.
   * Para ocultarla sin borrarla, usar updateImage({ isActive: false }).
   */
  async deleteImage(id: string): Promise<void> {
    const image = await this.getImage(id);
    await this.hardDeleteImage(id);
    if (image.isPrimary && image.specimenId) {
      await this.promoteNextPrimary(image.specimenId);
    }
  }

  /** Marca como principal la primera imagen activa de la muestra (si hay) */
  private async promoteNextPrimary(specimenId: string): Promise<void> {
    const next = await this.prisma.specimenImage.findFirst({
      where: { specimenId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (next) {
      await this.prisma.specimenImage.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  /**
   * Hard delete (remove files and database record)
   */
  async hardDeleteImage(id: string): Promise<void> {
    const image = await this.getImage(id);

    // Delete files
    const pathsToDelete = [image.filePath];
    if (image.thumbnailPath) pathsToDelete.push(image.thumbnailPath);
    if (image.mediumPath) pathsToDelete.push(image.mediumPath);
    if (image.largePath) pathsToDelete.push(image.largePath);

    for (const path of pathsToDelete) {
      try {
        await this.storageService.deleteFile(path);
      } catch (error) {
        this.logger.warn(`Failed to delete file ${path}: ${error.message}`);
      }
    }

    // Delete from database
    await this.prisma.specimenImage.delete({
      where: { id },
    });

    this.logger.log(`Image hard deleted: ${id}`);
  }

  /**
   * Get images by specimen ID
   */
  async getImagesBySpecimen(specimenId: string, includeInactive = false) {
    return this.prisma.specimenImage.findMany({
      where: { specimenId, ...(!includeInactive && { isActive: true }) },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Set primary image for specimen
   */
  async setPrimaryImage(imageId: string): Promise<void> {
    const image = await this.getImage(imageId);
    const specimenId = image.specimenId;
    if (!specimenId) {
      throw new BadRequestException('La imagen no está asociada a ninguna muestra');
    }
    if (!image.isActive) {
      throw new BadRequestException('Una imagen inhabilitada no puede ser la principal. Habilítala primero.');
    }

    // First, unset all primary images for this specimen
    await this.prisma.specimenImage.updateMany({
      where: { specimenId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set the new primary
    await this.prisma.specimenImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }

  /**
   * Update image metadata
   */
  async updateImage(id: string, data: UpdateImageDto) {
    const image = await this.getImage(id);
    const disabling = data.isActive === false && image.isActive;
    const enabling = data.isActive === true && !image.isActive;

    const updated = await this.prisma.specimenImage.update({
      where: { id },
      // Una imagen inhabilitada nunca queda como principal
      data: { ...data, ...(disabling && { isPrimary: false }) },
    });

    if (image.specimenId) {
      if (disabling && image.isPrimary) {
        await this.promoteNextPrimary(image.specimenId);
      }
      if (enabling) {
        const hasPrimary = await this.prisma.specimenImage.count({
          where: { specimenId: image.specimenId, isActive: true, isPrimary: true },
        });
        if (hasPrimary === 0) {
          return this.prisma.specimenImage.update({ where: { id }, data: { isPrimary: true } });
        }
      }
    }

    return updated;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalImages: number;
    totalFiles: number;
    totalSize: number;
    averageSize: number;
  }> {
    const totalImages = await this.prisma.specimenImage.count({
      where: { isActive: true },
    });

    const sizeAgg = await this.prisma.specimenImage.aggregate({
      where: { isActive: true },
      _sum: { size: true },
    });

    const totalSize = sizeAgg._sum.size || 0;
    const storageStats = await this.storageService.getStorageStats();

    return {
      totalImages,
      totalFiles: storageStats.totalFiles,
      totalSize,
      averageSize: totalImages > 0 ? Math.round(totalSize / totalImages) : 0,
    };
  }

  /**
   * Get URL for image (Cloudinary-like URL generation)
   */
  getImageUrl(
    imageId: string,
    options?: {
      version?: 'original' | 'thumbnail' | 'medium' | 'large';
      width?: number;
      height?: number;
      format?: 'webp' | 'jpeg' | 'png';
      quality?: number;
    },
  ): string {
    let url = `/images/${imageId}`;
    const params: string[] = [];

    if (options?.version && options.version !== 'original') {
      params.push(`version=${options.version}`);
    }
    if (options?.width) params.push(`width=${options.width}`);
    if (options?.height) params.push(`height=${options.height}`);
    if (options?.format) params.push(`format=${options.format}`);
    if (options?.quality) params.push(`quality=${options.quality}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return url;
  }
}
