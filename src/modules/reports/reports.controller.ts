import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { DocumentsService, DownloadFile } from './documents.service';
import { CollectorReportQuery } from './dto/collector-report.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Resumen del dashboard del panel (equipo: ADMIN y COLABORADOR).
   * Respeta permisos: las inactivas solo cuentan con specimens.status.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR)
  @ApiBearerAuth()
  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard summary for the panel (counts and recent activity)',
  })
  getDashboard(@CurrentUser() user: UserEntity) {
    return this.reportsService.getDashboard(user);
  }

  @Public()
  @Get('statistics')
  @ApiOperation({
    summary: 'Estadísticas públicas de la colección',
    description:
      'Totales y distribución por familia, orden, departamento, año y nivel de identificación (solo muestras activas).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  getStatistics() {
    return this.reportsService.getStatistics();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiBearerAuth()
  @Get('collectors')
  @ApiOperation({
    summary: 'Recolectores para el informe',
    description:
      'Usuarios recolectores y recolectores en texto (p. ej. importados), con su número de muestras. key = "user:<id>" o "name:<nombre>".',
  })
  listCollectors(@CurrentUser() user: UserEntity) {
    return this.documentsService.listCollectors(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiBearerAuth()
  @Get('collector-report')
  @ApiOperation({ summary: 'Informe de muestras por recolector (PDF o Excel)' })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async collectorReport(
    @Query() query: CollectorReportQuery,
    @CurrentUser() user: UserEntity,
    @Res() res: Response,
  ) {
    send(
      res,
      await this.documentsService.collectorReport(query.collector, query, user),
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('specimens/:id/sheet')
  @ApiOperation({
    summary: 'Ficha técnica de una muestra en PDF',
    description:
      'style=full (por defecto): ficha completa. style=label: etiqueta de herbario sobre la foto del pliego (requiere imagen). Pública para muestras activas; las inactivas requieren specimens.status.',
  })
  @ApiQuery({ name: 'style', required: false, enum: ['full', 'label'] })
  @ApiProduces('application/pdf')
  async specimenSheet(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity | null,
    @Res() res: Response,
    @Query('style') style?: string,
  ) {
    send(
      res,
      await this.documentsService.specimenSheet(
        id,
        user,
        style === 'label' ? 'label' : 'full',
      ),
    );
  }
}

/** Envía un archivo para descargar (el nombre se expone para que el front lo lea) */
function send(res: Response, file: DownloadFile) {
  res.set({
    'Content-Type': file.contentType,
    'Content-Disposition': `attachment; filename="${file.filename}"`,
    'Access-Control-Expose-Headers': 'Content-Disposition',
  });
  res.send(file.buffer);
}
