import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiPropertyOptional({
    description: 'Specimen ID to associate with this image',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  specimenId?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload',
  })
  file: Express.Multer.File;
}

export class UploadImageResponseDto {
  @ApiProperty({ description: 'UUID of the uploaded image' })
  id: string;

  @ApiProperty({ description: 'URLs for different versions' })
  versions: {
    original: ImageVersionDto;
    thumbnail?: ImageVersionDto;
    medium?: ImageVersionDto;
    large?: ImageVersionDto;
  };

  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;
}

export class ImageVersionDto {
  @ApiProperty({ description: 'API path to access the image' })
  path: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiPropertyOptional({ description: 'Image width in pixels' })
  width?: number;

  @ApiPropertyOptional({ description: 'Image height in pixels' })
  height?: number;
}
