import { Module } from '@nestjs/common';
import { DarwinCoreController } from './darwin-core.controller';
import { DarwinCoreService } from './darwin-core.service';
import { DwcImportService } from './import/dwc-import.service';

@Module({
  controllers: [DarwinCoreController],
  providers: [DarwinCoreService, DwcImportService],
  exports: [DarwinCoreService],
})
export class DarwinCoreModule {}
