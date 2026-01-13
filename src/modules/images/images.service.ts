import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Image, ImageDocument } from './entities/image.entity';
import { LocalStorageService } from './storage/local-storage.service';
import { ImageProcessingService } from './processors/image-processing.service';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { TransformImageDto } from './dto/transform-image.dto';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    private storageService: LocalStorageService,
    private processingService: ImageProcessingService,
  ) {}

  /**
   * Upload image with multiple versions (like Cloudinary)
   */
  async uploadImage(
    file: Express.Multer.File,
    specimenId: string | undefined,
    uploadedBy: string,
  ): Promise<UploadImageResponseDto> {
    try {
      // Validate image
      const isValid = await this.processingService.validateImage(file.buffer);
      if (!isValid) {
        throw new BadRequestException('Invalid image file');
      }

      // Get original metadata
      const metadata = await this.processingService.getMetadata(file.buffer);

      // Generate multiple versions
      const versions = await this.processingService.generateVersions(
        file.buffer,
      );

      // Save all versions to disk
      const savedVersions = await this.storageService.saveMultipleVersions(
        versions,
        file.originalname,
      );

      // Get dimensions for each version
      const versionsWithDimensions = {
        original: {
          ...savedVersions.original,
          width: metadata.width,
          height: metadata.height,
        },
        thumbnail: {
          ...savedVersions.thumbnail!,
          ...(await this.processingService.getMetadata(
            versions.get('thumbnail')!,
          )),
        },
        medium: {
          ...savedVersions.medium!,
          ...(await this.processingService.getMetadata(versions.get('medium')!)),
        },
        large: {
          ...savedVersions.large!,
          ...(await this.processingService.getMetadata(versions.get('large')!)),
        },
      };

      // Save metadata to MongoDB
      const imageDoc = new this.imageModel({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        specimenId,
        uploadedBy,
        versions: versionsWithDimensions,
        isActive: true,
      });

      const savedImage = await imageDoc.save();

      this.logger.log(
        `Image uploaded: ${savedImage.id} (${versions.size} versions)`,
      );

      return {
        id: savedImage.id,
        versions: versionsWithDimensions,
        originalName: file.originalname,
        mimeType: file.mimetype,
        uploadedAt: savedImage['createdAt'],
      };
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get image metadata by ID
   */
  async getImage(id: string): Promise<ImageDocument> {
    const image = await this.imageModel.findById(id).exec();
    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }
    return image;
  }

  /**
   * Get image file with optional transformations (like Cloudinary)
   */
  async getImageFile(
    id: string,
    version: 'original' | 'thumbnail' | 'medium' | 'large' = 'original',
    transformations?: TransformImageDto,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const image = await this.getImage(id);

    // Get the requested version path
    const versionData = image.versions[version];
    if (!versionData) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    // Read file from disk
    let buffer = await this.storageService.getFile(versionData.path);

    // Apply transformations if requested
    if (transformations && Object.keys(transformations).length > 0) {
      buffer = await this.processingService.transform(buffer, transformations);
    }

    // Determine MIME type based on format
    const format = transformations?.format || 'webp';
    const mimeType = `image/${format}`;

    return { buffer, mimeType };
  }

  /**
   * Delete image and all its versions
   */
  async deleteImage(id: string): Promise<void> {
    const image = await this.getImage(id);

    // Delete all files from disk
    await this.storageService.deleteAllVersions(image.versions);

    // Delete from MongoDB
    await this.imageModel.findByIdAndDelete(id).exec();

    this.logger.log(`Image deleted: ${id}`);
  }

  /**
   * Get images by specimen ID
   */
  async getImagesBySpecimen(specimenId: string): Promise<ImageDocument[]> {
    return this.imageModel.find({ specimenId, isActive: true }).exec();
  }

  /**
   * Update specimen association
   */
  async updateSpecimenAssociation(
    imageId: string,
    specimenId: string,
  ): Promise<ImageDocument> {
    const image = await this.imageModel
      .findByIdAndUpdate(imageId, { specimenId }, { new: true })
      .exec();

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    return image;
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
    const totalImages = await this.imageModel.countDocuments({ isActive: true });
    const storageStats = await this.storageService.getStorageStats();

    return {
      totalImages,
      totalFiles: storageStats.totalFiles,
      totalSize: storageStats.totalSize,
      averageSize:
        totalImages > 0
          ? Math.round(storageStats.totalSize / totalImages)
          : 0,
    };
  }
}
