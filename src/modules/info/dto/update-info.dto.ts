import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateInfoDto {
  @ApiPropertyOptional({
    example: 'Historia del Herbario',
    description: 'Título de la sección',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: '<p>El Herbario Digital de la Universidad...</p>',
    description: 'Contenido HTML de la sección',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateInfoDto {
  @ApiProperty({
    example: 'history',
    description: 'Clave única de la sección (history, data, contacts, terms)',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'Historia del Herbario',
    description: 'Título de la sección',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '<p>El Herbario Digital de la Universidad...</p>',
    description: 'Contenido HTML de la sección',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
