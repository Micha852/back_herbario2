import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsId } from '../../../common/utils/id.util';

export class DarwinCoreExportQuery {
  @ApiPropertyOptional({ enum: ['xlsx', 'csv'], default: 'xlsx' })
  @IsOptional()
  @IsIn(['xlsx', 'csv'], { message: 'El formato debe ser xlsx o csv' })
  format?: 'xlsx' | 'csv';

  @ApiPropertyOptional({ description: 'Fecha de colecta desde (AAAA-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de colecta hasta (AAAA-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida' })
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsId({ message: 'Proyecto no válido' })
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Incluir inactivas (requiere specimens.status)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
}

/** Datos de la colección (todos opcionales: se actualiza lo que llegue) */
export class UpdateCollectionSettingsDto {
  @IsOptional() @IsString() @MaxLength(120) labelTitle?: string;
  @IsOptional() @IsString() @MaxLength(100) occurrenceIdPrefix?: string;
  @IsOptional()
  @IsIn(
    [
      'PreservedSpecimen',
      'LivingSpecimen',
      'MaterialSample',
      'HumanObservation',
    ],
    {
      message: 'basisOfRecord no válido',
    },
  )
  basisOfRecord?: string;
  @IsOptional() @IsString() @MaxLength(200) institutionCode?: string;
  @IsOptional() @IsString() @MaxLength(100) institutionID?: string;
  @IsOptional() @IsString() @MaxLength(100) collectionCode?: string;
  @IsOptional() @IsString() @MaxLength(200) collectionID?: string;
  @IsOptional() @IsString() @MaxLength(100) ownerInstitutionCode?: string;
  @IsOptional() @IsString() @MaxLength(100) type?: string;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
  @IsOptional() @IsString() @MaxLength(200) accessRights?: string;
  @IsOptional() @IsString() @MaxLength(100) disposition?: string;
  @IsOptional() @IsString() @MaxLength(10) continent?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(5) countryCode?: string;
  @IsOptional() @IsString() @MaxLength(20) geodeticDatum?: string;
  @IsOptional() @IsString() @MaxLength(50) kingdom?: string;
  @IsOptional() @IsString() @MaxLength(20) nomenclaturalCode?: string;
}

/** Campos del formulario de importación (multipart) */
export class DarwinCoreImportDto {
  @ApiPropertyOptional({ default: false, description: 'false = vista previa' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  commit?: boolean;

  @ApiPropertyOptional({
    description: 'Proyecto al que se asocian todas las muestras',
  })
  @IsOptional()
  @IsId({ message: 'Proyecto no válido' })
  projectId?: string;
}
