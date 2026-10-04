import {
  ApiPropertyOptional,
  ApiProperty,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { NormalizeEmail } from '../../../common/utils/email.util';

const ROLES = Object.values(UserRole);
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Crear usuario desde el panel (solo ADMIN) */
export class AdminCreateUserDto {
  @ApiProperty({ example: 'Juan Pérez González' })
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'juan.perez@uniamazonia.edu.co' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES, { message: 'Rol no válido' })
  role: UserRole;

  @ApiPropertyOptional({
    description:
      'Si no se envía, se genera una contraseña temporal que se devuelve una sola vez',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCollector?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  genderId?: string;
}

/** Editar usuario desde el panel (solo ADMIN). La contraseña se cambia con reset-password */
export class AdminUpdateUserDto extends PartialType(
  OmitType(AdminCreateUserDto, ['password'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Query del listado (se interpreta en el servicio) */
export class AdminListUsersQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['', ...ROLES])
  role?: string;

  @IsOptional()
  @IsIn(['', 'true', 'false'])
  isActive?: string;

  @IsOptional()
  @IsIn(['', 'true', 'false'])
  isCollector?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  page?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  limit?: string;
}
