import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'usuario@uniamazonia.edu.co',
    description: 'Email del usuario para recuperar contraseña',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123token',
    description: 'Token de recuperación enviado al correo',
  })
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NuevaPassword123',
    description: 'Nueva contraseña',
  })
  @IsNotEmpty()
  newPassword: string;
}
