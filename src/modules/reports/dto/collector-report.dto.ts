import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CollectorReportQuery {
  @ApiProperty({
    description: '"user:<id>" o "name:<nombre>" (de GET /reports/collectors)',
  })
  @IsString()
  @MinLength(6, { message: 'Elige un recolector' })
  @MaxLength(250)
  collector: string;

  @ApiPropertyOptional({ enum: ['pdf', 'xlsx'], default: 'pdf' })
  @IsOptional()
  @IsIn(['pdf', 'xlsx'], { message: 'El formato debe ser pdf o xlsx' })
  format?: 'pdf' | 'xlsx';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida' })
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida' })
  endDate?: string;
}
