import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment text',
    example: 'Excelente espécimen, bien conservado.',
    minLength: 1,
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'El comentario no puede estar vacío' })
  @MaxLength(1000, { message: 'El comentario no puede superar 1000 caracteres' })
  text: string;

  @ApiProperty({
    description: 'Specimen ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  specimenId: string;
}
