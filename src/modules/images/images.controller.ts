import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ImagesService } from './images.service';
import { UploadImageDto, UploadImageResponseDto } from './dto/upload-image.dto';
import { TransformImageDto } from './dto/transform-image.dto';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload image with automatic multi-version generation',
    description:
      'Uploads an image and automatically generates thumbnail, medium, and large versions (like Cloudinary)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image uploaded successfully',
    type: UploadImageResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('specimenId') specimenId?: string,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // TODO: Get uploadedBy from JWT token (for now, use a placeholder)
    const uploadedBy = 'system';

    return this.imagesService.uploadImage(file, specimenId, uploadedBy);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get image with optional transformations (like Cloudinary)',
    description:
      'Retrieve an image with on-demand transformations (resize, format, quality)',
  })
  @ApiParam({ name: 'id', description: 'MongoDB image ID' })
  @ApiQuery({
    name: 'version',
    required: false,
    enum: ['original', 'thumbnail', 'medium', 'large'],
    description: 'Image version to retrieve',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    type: Number,
    description: 'Resize width',
  })
  @ApiQuery({
    name: 'height',
    required: false,
    type: Number,
    description: 'Resize height',
  })
  @ApiQuery({
    name: 'quality',
    required: false,
    type: Number,
    description: 'Image quality (1-100)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['webp', 'jpeg', 'png'],
    description: 'Output format',
  })
  @ApiQuery({
    name: 'crop',
    required: false,
    enum: ['cover', 'contain', 'fill'],
    description: 'Crop mode',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image retrieved successfully',
  })
  async getImage(
    @Param('id') id: string,
    @Query('version') version: 'original' | 'thumbnail' | 'medium' | 'large' = 'original',
    @Query() transformations: TransformImageDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mimeType } = await this.imagesService.getImageFile(
      id,
      version,
      transformations,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    res.send(buffer);
  }

  @Get(':id/metadata')
  @ApiOperation({ summary: 'Get image metadata' })
  @ApiParam({ name: 'id', description: 'MongoDB image ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image metadata retrieved successfully',
  })
  async getImageMetadata(@Param('id') id: string) {
    return this.imagesService.getImage(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete image and all its versions',
  })
  @ApiParam({ name: 'id', description: 'MongoDB image ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Image deleted successfully',
  })
  async deleteImage(@Param('id') id: string): Promise<void> {
    await this.imagesService.deleteImage(id);
  }

  @Get('specimen/:specimenId')
  @ApiOperation({ summary: 'Get all images for a specimen' })
  @ApiParam({ name: 'specimenId', description: 'Specimen UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Images retrieved successfully',
  })
  async getImagesBySpecimen(@Param('specimenId') specimenId: string) {
    return this.imagesService.getImagesBySpecimen(specimenId);
  }

  @Get('stats/storage')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Storage statistics retrieved successfully',
  })
  async getStorageStats() {
    return this.imagesService.getStorageStats();
  }
}
