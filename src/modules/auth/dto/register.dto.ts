import { CreateUserDto } from '../../users/dto/create-user.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** Paso 1 del registro: datos de la cuenta (se validan y se envía el código al correo) */
export class RegisterDto extends OmitType(CreateUserDto, [
  'roleId',
  'isActive',
] as const) {}

/** Paso 2: los mismos datos + el código que llegó al correo */
export class RegisterWithCodeDto extends RegisterDto {
  @ApiProperty({ description: 'Código de 6 dígitos enviado al correo' })
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code: string;
}
