import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/email.util';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Mensaje del formulario "Escríbenos" (/contacto). Con sesión se usan el nombre y el correo
 * de la cuenta; sin sesión, name y email son obligatorios (para poder responder).
 */
export class CreateFeedbackDto {
  @ApiProperty({
    example: 'Quisiera saber si puedo visitar la colección',
    description: 'Pregunta, sugerencia o comentario',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(2000, { message: 'El mensaje no puede exceder 2000 caracteres' })
  comment: string;

  @ApiPropertyOptional({ description: 'Sin sesión: nombre de quien escribe' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Sin sesión: correo para responder' })
  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(100)
  email?: string;

  /** Campo trampa: invisible para las personas; si llega con algo, lo llenó un bot */
  @ApiPropertyOptional({ description: 'Dejar vacío' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
