import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Tipos de imagen permitidos (el front muestra sus etiquetas en español) */
export const IMAGE_TYPES = [
  'general',
  'habit',
  'leaf',
  'flower',
  'fruit',
  'bark',
  'stem',
  'root',
  'detail',
  'label',
] as const;

export type ImageType = (typeof IMAGE_TYPES)[number];

/** Máximo de imágenes activas por muestra */
export const MAX_IMAGES_PER_SPECIMEN = 10;

export class UpdateImageDto {
  @ApiPropertyOptional({ description: 'Image caption', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;

  @ApiPropertyOptional({ enum: IMAGE_TYPES })
  @IsOptional()
  @IsIn(IMAGE_TYPES)
  imageType?: ImageType;

  @ApiPropertyOptional({
    description:
      'false = inhabilitada: se oculta al público pero se conserva el archivo',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order (0 = first)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
