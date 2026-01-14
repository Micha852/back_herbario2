import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxonomyDto {
  @ApiProperty({
    description: 'Taxonomy name',
    example: 'Magnoliopsida',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Is active?',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
