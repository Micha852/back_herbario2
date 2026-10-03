import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    example: 'Sugerencia sobre la interfaz de búsqueda',
    description: 'Comentario o sugerencia del usuario',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El comentario debe tener al menos 10 caracteres' })
  @MaxLength(2000, {
    message: 'El comentario no puede exceder 2000 caracteres',
  })
  comment: string;
}
