import {
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchSpecimenDto {
  @ApiPropertyOptional({
    description: 'General search: scientific/common name, catalog number, species, genus or family',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Search by scientific name' })
  @IsOptional()
  @IsString()
  scientificName?: string;

  @ApiPropertyOptional({ description: 'Search by common name' })
  @IsOptional()
  @IsString()
  commonName?: string;

  @ApiPropertyOptional({ description: 'Search by catalog number' })
  @IsOptional()
  @IsString()
  catalogNumber?: string;

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

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by municipality ID' })
  @IsOptional()
  @IsUUID()
  municipalityId?: string;

  @ApiPropertyOptional({ description: 'Collection date from (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Collection date to, inclusive (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['recent', 'name', 'collectionDate'],
    default: 'recent',
  })
  @IsOptional()
  @IsIn(['recent', 'name', 'collectionDate'])
  sort?: 'recent' | 'name' | 'collectionDate' = 'recent';

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filter by collector ID' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({ description: 'Con imágenes (true) o sin imágenes (false)' })
  @IsOptional()
  @IsIn(['true', 'false'])
  hasImages?: 'true' | 'false';

  @ApiPropertyOptional({ description: 'Origen: MANUAL (formulario) o IMPORT (Darwin Core)', enum: ['MANUAL', 'IMPORT'] })
  @IsOptional()
  @IsIn(['MANUAL', 'IMPORT'])
  source?: 'MANUAL' | 'IMPORT';

  @ApiPropertyOptional({
    description: 'Nivel de identificación: species, genus (solo género), family (solo familia) o none',
    enum: ['species', 'genus', 'family', 'none'],
  })
  @IsOptional()
  @IsIn(['species', 'genus', 'family', 'none'])
  taxonLevel?: 'species' | 'genus' | 'family' | 'none';

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : value === 'true')
  @IsBoolean()
  isActive?: boolean;

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
