import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsId } from '../../../common/utils/id.util';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Inventario Flora Amazónica 2024',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Start date',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Effort in days',
    example: '120',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  effortDays?: string;

  @ApiPropertyOptional({
    description: 'Observations',
    example: 'Proyecto de investigación sobre biodiversidad amazónica',
  })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiPropertyOptional({
    description: 'Protocol ID',
  })
  @IsOptional()
  @IsId()
  protocolId?: string;

  @ApiPropertyOptional({
    description: 'Start time',
    example: '08:00',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time',
    example: '17:00',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  endTime?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
