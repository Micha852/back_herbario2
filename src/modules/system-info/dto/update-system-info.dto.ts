import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSystemInfoDto {
    @IsString()
    @IsNotEmpty()
    content: string;
}
