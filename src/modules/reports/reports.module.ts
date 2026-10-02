import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DocumentsService } from './documents.service';
import { ImagesModule } from '../images/images.module';
import { DarwinCoreModule } from '../darwin-core/darwin-core.module';

@Module({
  imports: [ImagesModule, DarwinCoreModule],
  controllers: [ReportsController],
  providers: [ReportsService, DocumentsService],
  exports: [ReportsService],
})
export class ReportsModule {}
