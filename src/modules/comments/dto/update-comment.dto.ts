import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'New comment text',
    minLength: 1,
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'El comentario no puede estar vacío' })
  @MaxLength(1000, {
    message: 'El comentario no puede superar 1000 caracteres',
  })
  text: string;
}
