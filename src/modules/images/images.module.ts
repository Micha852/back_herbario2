import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { Image, ImageSchema } from './entities/image.entity';
import { LocalStorageService } from './storage/local-storage.service';
import { ImageProcessingService } from './processors/image-processing.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }]),
  ],
  controllers: [ImagesController],
  providers: [ImagesService, LocalStorageService, ImageProcessingService],
  exports: [ImagesService],
})
export class ImagesModule {}
