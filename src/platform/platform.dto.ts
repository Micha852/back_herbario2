import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../common/utils/email.util';
import { SLUG_PATTERN } from '../tenancy/tenant-slug';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PlatformLoginDto {
  @ApiProperty()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}

export class CreateHerbariumDto {
  @ApiProperty({ example: 'coah', description: 'Subdominio: <slug>.dominio' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(SLUG_PATTERN, {
    message:
      'El identificador solo admite minúsculas, números y guiones (2 a 40), sin guion al inicio ni al final',
  })
  slug: string;

  @ApiProperty({ example: 'Herbario Amazónico Colombiano' })
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo de contacto no es válido' })
  @MaxLength(100)
  contactEmail?: string;

  @ApiProperty({ description: 'Primer administrador del herbario' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo del administrador no es válido' })
  @MaxLength(100)
  adminEmail: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(3, {
    message: 'El nombre del administrador debe tener al menos 3 caracteres',
  })
  @MaxLength(100)
  adminName: string;
}

export class UpdateHerbariumDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo de contacto no es válido' })
  @MaxLength(100)
  contactEmail?: string;
}

/** Reintento de un herbario FAILED: el primer administrador otra vez (nueva contraseña temporal) */
export class RetryHerbariumDto extends PickType(CreateHerbariumDto, [
  'adminEmail',
  'adminName',
] as const) {}
