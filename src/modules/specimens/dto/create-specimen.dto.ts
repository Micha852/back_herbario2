import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsInt,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSpecimenDto {
  @ApiProperty({
    description: 'Scientific name',
    example: 'Cedrela odorata',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  scientificName: string;

  @ApiPropertyOptional({
    description: 'Common/vulgar name',
    example: 'Cedro',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  commonName?: string;

  @ApiPropertyOptional({
    description: 'Collection date',
    example: '2024-03-15',
  })
  @IsOptional()
  @IsDateString()
  collectionDate?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 1.6144,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -75.6062,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Altitude in meters',
    example: 280,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  altitude?: number;

  // Taxonomic classification
  @ApiPropertyOptional({ description: 'Division ID' })
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional({ description: 'Class ID' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Family ID' })
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiPropertyOptional({ description: 'Genus ID' })
  @IsOptional()
  @IsUUID()
  genusId?: string;

  @ApiPropertyOptional({ description: 'Species ID' })
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  // Location
  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  // Leaf characteristics
  @ApiPropertyOptional({ description: 'Venation type ID' })
  @IsOptional()
  @IsUUID()
  venationTypeId?: string;

  @ApiPropertyOptional({ description: 'Form type ID' })
  @IsOptional()
  @IsUUID()
  formTypeId?: string;

  @ApiPropertyOptional({ description: 'Margin type ID' })
  @IsOptional()
  @IsUUID()
  marginTypeId?: string;

  // Origin
  @ApiPropertyOptional({ description: 'Origin ID' })
  @IsOptional()
  @IsUUID()
  originId?: string;

  // Project
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  // Additional fields
  @ApiPropertyOptional({ description: 'Number of adults', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  adultsCount?: number;

  @ApiPropertyOptional({ description: 'Number of juveniles', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  juvenilesCount?: number;

  @ApiPropertyOptional({ description: 'Condition ID' })
  @IsOptional()
  @IsUUID()
  conditionId?: string;

  @ApiPropertyOptional({ description: 'Origin type ID' })
  @IsOptional()
  @IsUUID()
  originTypeId?: string;

  @ApiPropertyOptional({
    description: 'Minimum elevation in meters',
    example: 200,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  minElevation?: number;

  @ApiPropertyOptional({
    description: 'Maximum elevation in meters',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  maxElevation?: number;

  @ApiPropertyOptional({ description: 'Habitat ID' })
  @IsOptional()
  @IsUUID()
  habitatId?: string;

  @ApiPropertyOptional({
    description: 'Local observation notes',
    example: 'Árbol de 15m de altura, corteza agrietada',
  })
  @IsOptional()
  @IsString()
  localObservation?: string;

  @ApiPropertyOptional({
    description: 'Catalog number (auto-generated if not provided)',
    example: 'HUAZ-001234',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  catalogNumber?: string;

  @ApiPropertyOptional({
    description: 'Registry number',
    example: 'REG-2024-0001',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registryNumber?: string;

  @ApiPropertyOptional({
    description: 'Author who identified the specimen',
    example: 'Dr. Juan Pérez',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Collector user IDs',
    type: [String],
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  collectorIds?: string[];
}
