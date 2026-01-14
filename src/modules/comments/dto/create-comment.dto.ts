import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment text',
    example: 'Excelente espécimen, bien conservado.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text: string;

  @ApiProperty({
    description: 'Specimen ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  specimenId: string;
}
