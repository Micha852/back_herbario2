import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessingOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  // Default sizes for different versions
  private readonly SIZES = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 800, height: 600 },
    large: { width: 1920, height: 1080 },
  };

  /**
   * Process image: resize, convert format, optimize
   */
  async processImage(
    buffer: Buffer,
    options: ProcessingOptions = {},
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      // Resize if dimensions specified
      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height, {
          fit: options.fit || 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert format and set quality
      const format = options.format || 'webp';
      const quality = options.quality || 80;

      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
      }

      const result = await pipeline.toBuffer();
      this.logger.debug(
        `Processed image: ${buffer.length} -> ${result.length} bytes`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to process image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate multiple versions of an image (thumbnail, medium, large, original)
   */
  async generateVersions(
    buffer: Buffer,
    generateOriginal = true,
  ): Promise<Map<string, Buffer>> {
    const versions = new Map<string, Buffer>();

    try {
      // Original (just optimize, don't resize)
      if (generateOriginal) {
        const original = await this.processImage(buffer, {
          quality: 90,
          format: 'webp',
        });
        versions.set('original', original);
      }

      // Thumbnail
      const thumbnail = await this.processImage(buffer, {
        width: this.SIZES.thumbnail.width,
        height: this.SIZES.thumbnail.height,
        fit: 'cover',
        quality: 75,
        format: 'webp',
      });
      versions.set('thumbnail', thumbnail);

      // Medium
      const medium = await this.processImage(buffer, {
        width: this.SIZES.medium.width,
        height: this.SIZES.medium.height,
        fit: 'inside',
        quality: 80,
        format: 'webp',
      });
      versions.set('medium', medium);

      // Large
      const large = await this.processImage(buffer, {
        width: this.SIZES.large.width,
        height: this.SIZES.large.height,
        fit: 'inside',
        quality: 85,
        format: 'webp',
      });
      versions.set('large', large);

      this.logger.log(
        `Generated ${versions.size} versions from ${buffer.length} bytes`,
      );

      return versions;
    } catch (error) {
      this.logger.error(`Failed to generate versions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform image on-demand (like Cloudinary)
   */
  async transform(
    buffer: Buffer,
    transformations: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
      crop?: 'cover' | 'contain' | 'fill';
    },
  ): Promise<Buffer> {
    return this.processImage(buffer, {
      width: transformations.width,
      height: transformations.height,
      quality: transformations.quality,
      format: transformations.format || 'webp',
      fit: transformations.crop || 'inside',
    });
  }

  /**
   * Validate if buffer is a valid image
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      await sharp(buffer).metadata();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Optimize image without resizing
   */
  async optimize(buffer: Buffer, format?: 'webp' | 'jpeg' | 'png'): Promise<Buffer> {
    return this.processImage(buffer, {
      format: format || 'webp',
      quality: 85,
    });
  }
}
