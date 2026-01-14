import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'GPS coordinates',
    example: '1.6144° N, 75.6062° W',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  coordinates?: string;

  @ApiPropertyOptional({
    description: 'Altitude',
    example: '280 msnm',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  altitude?: string;

  // Taxonomic classification
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

  @ApiPropertyOptional({ description: 'Division ID' })
  @IsOptional()
  @IsUUID()
  divisionId?: string;

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
  adultsCount?: number;

  @ApiPropertyOptional({ description: 'Number of juveniles', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
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
    description: 'Minimum elevation',
    example: '200',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  minElevation?: string;

  @ApiPropertyOptional({
    description: 'Maximum elevation',
    example: '500',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  maxElevation?: string;

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
    description: 'Catalog number',
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
