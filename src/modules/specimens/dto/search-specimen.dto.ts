import { IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchSpecimenDto {
  @ApiPropertyOptional({ description: 'Search by scientific name' })
  @IsOptional()
  @IsString()
  scientificName?: string;

  @ApiPropertyOptional({ description: 'Search by common name' })
  @IsOptional()
  @IsString()
  commonName?: string;

  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Filter by family ID' })
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiPropertyOptional({ description: 'Filter by genus ID' })
  @IsOptional()
  @IsUUID()
  genusId?: string;

  @ApiPropertyOptional({ description: 'Filter by species ID' })
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @ApiPropertyOptional({ description: 'Filter by division ID' })
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filter by collector ID' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
