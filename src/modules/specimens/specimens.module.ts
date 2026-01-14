import { Module } from '@nestjs/common';
import { SpecimensService } from './specimens.service';
import { SpecimensController } from './specimens.controller';

@Module({
  controllers: [SpecimensController],
  providers: [SpecimensService],
  exports: [SpecimensService],
})
export class SpecimensModule {}
