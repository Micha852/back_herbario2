import { IsString, IsUUID, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({
    description: 'Location name',
    example: 'Reserva Natural El Cedro',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Location type ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  locationTypeId: string;

  @ApiProperty({
    description: 'Municipality ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  municipalityId: string;

  @ApiPropertyOptional({
    description: 'Water body name',
    example: 'Río Caquetá',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  waterBody?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
