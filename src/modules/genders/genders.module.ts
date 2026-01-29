import { Module } from '@nestjs/common';
import { GendersController } from './genders.controller';
import { GendersService } from './genders.service';

@Module({
    imports: [],
    controllers: [GendersController],
    providers: [GendersService],
})
export class GendersModule { }
