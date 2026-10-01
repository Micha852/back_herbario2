import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { UserEntity } from '../users/entities/user.entity';
import { DarwinCoreService } from './darwin-core.service';
import { DWC_TERMS } from './dwc-terms';
import { DwcImportService } from './import/dwc-import.service';
import {
  DarwinCoreExportQuery,
  DarwinCoreImportDto,
  UpdateCollectionSettingsDto,
} from './dto/darwin-core.dto';

@ApiTags('Darwin Core')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('darwin-core')
export class DarwinCoreController {
  constructor(
    private readonly darwinCoreService: DarwinCoreService,
    private readonly importService: DwcImportService,
  ) {}

  @Get('collection')
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE, PERMISSIONS.CMS_EDIT)
  @ApiOperation({ summary: 'Datos de la colección y términos que se exportan' })
  async getCollection() {
    return {
      settings: await this.darwinCoreService.getCollectionSettings(),
      terms: DWC_TERMS,
    };
  }

  @Put('collection')
  @RequirePermissions(PERMISSIONS.CMS_EDIT)
  @ApiOperation({ summary: 'Actualizar los datos de la colección' })
  updateCollection(@Body() dto: UpdateCollectionSettingsDto) {
    return this.darwinCoreService.updateCollectionSettings(dto);
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiOperation({
    summary: 'Descargar las muestras en Darwin Core (Excel o CSV)',
    description:
      'Mismas columnas y orden que la plantilla de publicación (SiB Colombia / GBIF). Filtros por fecha de colecta y proyecto.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  )
  async export(
    @Query() query: DarwinCoreExportQuery,
    @CurrentUser() user: UserEntity & { permissions?: string[] },
    @Res() res: Response,
  ) {
    const file = await this.darwinCoreService.export(query, user);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'X-Record-Count': String(file.count),
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Record-Count',
    });
    res.send(file.buffer);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.SPECIMENS_IMPORT)
  @ApiOperation({
    summary: 'Importar muestras desde Darwin Core (.xlsx o .csv)',
    description:
      'commit=false (por defecto): vista previa sin guardar nada. commit=true: importa en una transacción. Los números de catálogo existentes se omiten.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        commit: { type: 'boolean' },
        projectId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: DarwinCoreImportDto,
    @CurrentUser() user: UserEntity,
  ) {
    if (!file) throw new BadRequestException('Adjunta un archivo .xlsx o .csv');
    return this.importService.import(file, {
      commit: dto.commit === true,
      projectId: dto.projectId,
      userId: user.id,
    });
  }
}
