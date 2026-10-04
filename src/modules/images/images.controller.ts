import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ImagesService } from './images.service';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { TransformImageDto } from './dto/transform-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { IMAGE_TYPES, UpdateImageDto } from './dto/update-image.dto';
import { isUUID } from 'class-validator';
import { SkipThrottle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { hasPermission } from '../permissions/permissions.logic';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Las imágenes se editan con los mismos permisos que su muestra.
   * Imágenes sin muestra asociada (del sitio, p. ej. fondo y logo del inicio):
   * con specimens.edit_any o cms.edit.
   */
  private async assertCanEditImage(user: UserEntity, imageId: string): Promise<void> {
    const image = await this.imagesService.getImage(imageId);
    if (image.specimenId) {
      await this.permissionsService.assertCanEditSpecimen(user, image.specimenId);
    } else if (
      !hasPermission(user.permissions, PERMISSIONS.SPECIMENS_EDIT_ANY) &&
      !hasPermission(user.permissions, PERMISSIONS.CMS_EDIT)
    ) {
      throw new ForbiddenException('No tienes permiso para editar esta imagen');
    }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  // Sin specimenId son imágenes del sitio (fondo y logo del inicio, desde el CMS)
  @RequirePermissions(PERMISSIONS.SPECIMENS_CREATE, PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN, PERMISSIONS.CMS_EDIT)
  @ApiBearerAuth()
  @Post('upload')
  @ApiOperation({
    summary: 'Upload image (Cloudinary-like service)',
    description:
      'Uploads an image and automatically generates thumbnail, medium, and large versions',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'specimenId', required: false, description: 'Associate with specimen' })
  @ApiQuery({ name: 'imageType', required: false, enum: IMAGE_TYPES, description: 'Image type (habit, leaf, flower, etc.)' })
  @ApiQuery({ name: 'caption', required: false, description: 'Image caption' })
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
            new BadRequestException('Only image files are allowed (jpeg, png, webp)'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserEntity,
    @Query('specimenId') specimenId?: string,
    @Query('imageType') imageType?: string,
    @Query('caption') caption?: string,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (specimenId && !isUUID(specimenId)) {
      throw new BadRequestException('specimenId must be a UUID');
    }
    if (imageType && !(IMAGE_TYPES as readonly string[]).includes(imageType)) {
      throw new BadRequestException(`imageType must be one of: ${IMAGE_TYPES.join(', ')}`);
    }
    if (specimenId) {
      await this.permissionsService.assertCanEditSpecimen(user, specimenId);
    }
    if (caption && caption.length > 255) {
      throw new BadRequestException('caption must be shorter than or equal to 255 characters');
    }

    return this.imagesService.uploadImage(
      file,
      specimenId,
      user.id,
      imageType || 'general',
      caption,
    );
  }

  @Public()
  @SkipThrottle() // la galería pide muchas imágenes
  @Get(':id')
  @ApiOperation({
    summary: 'Get image with transformations (Cloudinary-like)',
    description:
      'Retrieve an image with on-demand transformations (resize, format, quality). URLs are public.',
  })
  @ApiParam({ name: 'id', description: 'Image UUID' })
  @ApiQuery({
    name: 'version',
    required: false,
    enum: ['original', 'thumbnail', 'medium', 'large'],
    description: 'Pre-generated image version',
  })
  @ApiQuery({ name: 'width', required: false, type: Number, description: 'Resize width (on-the-fly)' })
  @ApiQuery({ name: 'height', required: false, type: Number, description: 'Resize height (on-the-fly)' })
  @ApiQuery({ name: 'quality', required: false, type: Number, description: 'Quality 1-100 (on-the-fly)' })
  @ApiQuery({ name: 'format', required: false, enum: ['webp', 'jpeg', 'png'], description: 'Output format' })
  @ApiQuery({ name: 'crop', required: false, enum: ['cover', 'contain', 'fill'], description: 'Crop mode' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image retrieved successfully' })
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
      'Cache-Control': 'public, max-age=31536000, immutable', // Cache 1 year
      'ETag': `"${id}-${version}"`,
    });

    res.send(buffer);
  }

  @Public()
  @SkipThrottle()
  @Get(':id/metadata')
  @ApiOperation({ summary: 'Get image metadata' })
  @ApiParam({ name: 'id', description: 'Image UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image metadata retrieved' })
  async getImageMetadata(@Param('id') id: string) {
    const image = await this.imagesService.getImage(id);
    return {
      id: image.id,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      imageType: image.imageType,
      caption: image.caption,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt,
      urls: {
        original: this.imagesService.getImageUrl(image.id),
        thumbnail: this.imagesService.getImageUrl(image.id, { version: 'thumbnail' }),
        medium: this.imagesService.getImageUrl(image.id, { version: 'medium' }),
        large: this.imagesService.getImageUrl(image.id, { version: 'large' }),
      },
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update image metadata (caption, type, order)' })
  @ApiParam({ name: 'id', description: 'Image UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image updated' })
  async updateImage(
    @Param('id') id: string,
    @Body() data: UpdateImageDto,
    @CurrentUser() user: UserEntity,
  ) {
    await this.assertCanEditImage(user, id);
    return this.imagesService.updateImage(id, data);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN)
  @ApiBearerAuth()
  @Patch(':id/primary')
  @ApiOperation({ summary: 'Set as primary image of its specimen' })
  @ApiParam({ name: 'id', description: 'Image UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Primary image set' })
  async setPrimaryImage(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    await this.assertCanEditImage(user, id);
    await this.imagesService.setPrimaryImage(id);
    return { message: 'Primary image set successfully' };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SPECIMENS_EDIT_ANY, PERMISSIONS.SPECIMENS_EDIT_OWN, PERMISSIONS.CMS_EDIT)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete image permanently (files + record). To hide it instead, PATCH isActive=false' })
  @ApiParam({ name: 'id', description: 'Image UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Image deleted' })
  async deleteImage(@Param('id') id: string, @CurrentUser() user: UserEntity): Promise<void> {
    await this.assertCanEditImage(user, id);
    await this.imagesService.deleteImage(id);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('specimen/:specimenId')
  @ApiOperation({
    summary: 'Get all images for a specimen',
    description: 'Public: only enabled images. Users who can edit the specimen can pass includeInactive=true to also get disabled ones.',
  })
  @ApiParam({ name: 'specimenId', description: 'Specimen UUID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: HttpStatus.OK, description: 'Images retrieved' })
  async getImagesBySpecimen(
    @Param('specimenId') specimenId: string,
    @CurrentUser() user: UserEntity | null,
    @Query('includeInactive') includeInactive?: string,
  ) {
    let canSeeDisabled = false;
    if (user && includeInactive === 'true') {
      canSeeDisabled = await this.permissionsService
        .assertCanEditSpecimen(user, specimenId)
        .then(() => true)
        .catch(() => false);
    }
    const images = await this.imagesService.getImagesBySpecimen(specimenId, canSeeDisabled);
    return images.map((image) => ({
      id: image.id,
      originalName: image.originalName,
      imageType: image.imageType,
      caption: image.caption,
      isPrimary: image.isPrimary,
      isActive: image.isActive,
      sortOrder: image.sortOrder,
      urls: {
        original: this.imagesService.getImageUrl(image.id),
        thumbnail: this.imagesService.getImageUrl(image.id, { version: 'thumbnail' }),
        medium: this.imagesService.getImageUrl(image.id, { version: 'medium' }),
      },
    }));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('stats/storage')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Storage statistics' })
  async getStorageStats() {
    return this.imagesService.getStorageStats();
  }
}
