import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TransformImageDto {
  @ApiPropertyOptional({
    description: 'Width in pixels',
    minimum: 1,
    maximum: 4000,
    example: 800,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4000)
  width?: number;

  @ApiPropertyOptional({
    description: 'Height in pixels',
    minimum: 1,
    maximum: 4000,
    example: 600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4000)
  height?: number;

  @ApiPropertyOptional({
    description: 'Image quality (1-100)',
    minimum: 1,
    maximum: 100,
    default: 80,
    example: 85,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiPropertyOptional({
    description: 'Output format',
    enum: ['webp', 'jpeg', 'png'],
    default: 'webp',
    example: 'webp',
  })
  @IsOptional()
  @IsIn(['webp', 'jpeg', 'png'])
  format?: 'webp' | 'jpeg' | 'png';

  @ApiPropertyOptional({
    description: 'Crop/fit mode',
    enum: ['cover', 'contain', 'fill'],
    default: 'inside',
    example: 'cover',
  })
  @IsOptional()
  @IsIn(['cover', 'contain', 'fill'])
  crop?: 'cover' | 'contain' | 'fill';
}
