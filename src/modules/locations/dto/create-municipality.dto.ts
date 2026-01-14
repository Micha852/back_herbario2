import { IsString, IsUUID, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMunicipalityDto {
  @ApiProperty({
    description: 'Municipality name',
    example: 'Florencia',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Department ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
