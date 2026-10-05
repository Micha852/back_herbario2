import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/email.util';
import { IsId } from '../../../common/utils/id.util';

/**
 * Fields a user can change on their own profile.
 * Role, active state and collector flag are admin-only (see PATCH /users/:id).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Pérez González' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name?: string;

  @ApiPropertyOptional({ example: 'juan.perez@uniamazonia.edu.co' })
  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({
    description:
      'Obligatorio si cambia el correo: código enviado al correo nuevo (POST /auth/profile/email/code)',
  })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  emailCode?: string;

  @ApiPropertyOptional({ description: 'Gender ID (UUID)' })
  @IsOptional()
  @IsId()
  genderId?: string;

  @ApiPropertyOptional({ description: 'User type ID (UUID)' })
  @IsOptional()
  @IsId()
  typeId?: string;

  @ApiPropertyOptional({ description: 'Institution ID (UUID)' })
  @IsOptional()
  @IsId()
  institutionId?: string;
}

/** Cambio de correo, paso 1: enviar el código al correo nuevo */
export class SendEmailCodeDto {
  @ApiProperty({ example: 'juan.perez@uniamazonia.edu.co' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(100)
  email: string;
}
