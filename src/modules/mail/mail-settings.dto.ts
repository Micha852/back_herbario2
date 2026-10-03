import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const emptyOr = (o: unknown, k: string) =>
  ((o as Record<string, unknown>)[k] ?? '') !== '';

export class UpdateMailSettingsDto {
  @ApiPropertyOptional({ example: 'smtp.gmail.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  host?: string;

  @ApiPropertyOptional({
    example: 587,
    description: '587 (STARTTLS) o 465 (SSL)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El puerto debe ser un número' })
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: 'herbario@gmail.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  user?: string;

  @ApiPropertyOptional({
    description: 'Contraseña de aplicación. Vacía = conservar la actual',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;

  @ApiPropertyOptional({ example: 'Herbario HUAZ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fromName?: string;

  @ApiPropertyOptional({
    description: 'Correo remitente (si se deja vacío se usa el usuario)',
  })
  @IsOptional()
  @ValidateIf((o) => emptyOr(o, 'fromEmail'))
  @IsEmail({}, { message: 'El correo remitente no es válido' })
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Quién recibe el buzón de sugerencias' })
  @IsOptional()
  @ValidateIf((o) => emptyOr(o, 'feedbackTo'))
  @IsEmail({}, { message: 'El correo del buzón no es válido' })
  feedbackTo?: string;
}

export class TestMailDto {
  @ApiPropertyOptional({
    description: 'Destinatario (por defecto, el correo del admin)',
  })
  @IsOptional()
  @ValidateIf((o) => emptyOr(o, 'to'))
  @IsEmail({}, { message: 'El correo de destino no es válido' })
  to?: string;
}
