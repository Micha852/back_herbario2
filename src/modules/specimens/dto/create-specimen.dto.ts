import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsId } from '../../../common/utils/id.util';

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

  // Taxonomía: se liga el nivel más bajo identificado (especie > género > familia).
  // Si llegan varios, gana el más bajo; el resto de la jerarquía sale de ese nivel.
  @ApiPropertyOptional({ description: 'Especie' })
  @IsOptional()
  @IsId()
  speciesId?: string;

  @ApiPropertyOptional({
    description: 'Género (si se identificó solo hasta género)',
  })
  @IsOptional()
  @IsId()
  genusId?: string;

  @ApiPropertyOptional({
    description: 'Familia (si se identificó solo hasta familia)',
  })
  @IsOptional()
  @IsId()
  familyId?: string;

  // Location
  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsId()
  locationId?: string;

  // Leaf characteristics
  @ApiPropertyOptional({ description: 'Venation type ID' })
  @IsOptional()
  @IsId()
  venationTypeId?: string;

  @ApiPropertyOptional({ description: 'Form type ID' })
  @IsOptional()
  @IsId()
  formTypeId?: string;

  @ApiPropertyOptional({ description: 'Margin type ID' })
  @IsOptional()
  @IsId()
  marginTypeId?: string;

  // Origin
  @ApiPropertyOptional({ description: 'Origin ID' })
  @IsOptional()
  @IsId()
  originId?: string;

  // Project
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsId()
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
  @IsId()
  conditionId?: string;

  @ApiPropertyOptional({ description: 'Origin type ID' })
  @IsOptional()
  @IsId()
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
  @IsId()
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
    description:
      'Autor del nombre científico (Darwin Core: scientificNameAuthorship)',
    example: '(Willd.) Britton & Rose',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @ApiPropertyOptional({
    description: 'Quién identificó la muestra (Darwin Core: identifiedBy)',
    example: 'Claudia M. Santofimio-Celis',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  identifiedBy?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de identificación (Darwin Core: dateIdentified). Admite "2020", "2020-10", "2020-10-05" o rangos "2020-08-17/2020-10-20"',
    example: '2020-10',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d{4}(-\d{2}(-\d{2})?)?(\/\d{4}(-\d{2}(-\d{2})?)?)?$/, {
    message:
      'La fecha de identificación debe tener el formato AAAA, AAAA-MM, AAAA-MM-DD o un rango con "/"',
  })
  dateIdentified?: string;

  @ApiPropertyOptional({
    description: 'Notas de identificación (Darwin Core: taxonRemarks)',
  })
  @IsOptional()
  @IsString()
  identificationNotes?: string;

  @ApiPropertyOptional({
    description: 'Notas de campo (Darwin Core: fieldNotes)',
  })
  @IsOptional()
  @IsString()
  fieldNotes?: string;

  @ApiPropertyOptional({
    description:
      'Recolectores que no son usuarios del sistema, separados por " | "',
    example: 'Diego A. Caicedo-Araujo | Claudia A. Calderon-Soto',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  otherCollectors?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Collector user IDs',
    type: [String],
  })
  @IsOptional()
  @IsId({ each: true })
  collectorIds?: string[];
}
