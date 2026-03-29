import { Module } from '@nestjs/common';
import { SpecimensService } from './specimens.service';
import { SpecimensController } from './specimens.controller';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [ImagesModule],
  controllers: [SpecimensController],
  providers: [SpecimensService],
  exports: [SpecimensService],
})
export class SpecimensModule {}
