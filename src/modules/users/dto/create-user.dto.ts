import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NormalizeEmail } from '../../../common/utils/email.util';
import { IsId } from '../../../common/utils/id.util';

export class CreateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'Juan Pérez González',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'juan.perez@uniamazonia.edu.co',
  })
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({
    description:
      'User password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    example: 'SecurePass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'Role ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsId()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Gender ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsId()
  genderId?: string;

  @ApiPropertyOptional({
    description: 'User type ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsId()
  typeId?: string;

  @ApiPropertyOptional({
    description: 'Institution ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsId()
  institutionId?: string;

  @ApiPropertyOptional({
    description: 'Is user a collector?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCollector?: boolean;

  @ApiPropertyOptional({
    description: 'Is user active?',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
