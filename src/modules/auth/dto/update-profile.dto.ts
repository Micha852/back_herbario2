import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Fields a user can change on their own profile.
 * Role, active state and collector flag are admin-only (see PATCH /users/:id).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Pérez González' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'juan.perez@uniamazonia.edu.co' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Gender ID (UUID)' })
  @IsOptional()
  @IsUUID()
  genderId?: string;

  @ApiPropertyOptional({ description: 'User type ID (UUID)' })
  @IsOptional()
  @IsUUID()
  typeId?: string;

  @ApiPropertyOptional({ description: 'Institution ID (UUID)' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}
