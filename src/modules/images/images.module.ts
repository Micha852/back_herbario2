import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { LocalStorageService } from './storage/local-storage.service';
import { ImageProcessingService } from './processors/image-processing.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ImagesController],
  providers: [ImagesService, LocalStorageService, ImageProcessingService],
  exports: [ImagesService],
})
export class ImagesModule {}
