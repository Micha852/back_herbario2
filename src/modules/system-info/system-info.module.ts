import { ImagesModule } from '../images/images.module';
import { Module } from '@nestjs/common';
import { SystemInfoController } from './system-info.controller';
import { SystemInfoService } from './system-info.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule, ImagesModule],
    controllers: [SystemInfoController],
    providers: [SystemInfoService],
    exports: [SystemInfoService],
})
export class SystemInfoModule { }
