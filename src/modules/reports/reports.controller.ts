import {
  Controller,
  Get,
  Param,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
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
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Resumen del dashboard del panel (equipo: ADMIN y COLABORADOR).
   * Respeta permisos: las inactivas solo cuentan con specimens.status.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR)
  @ApiBearerAuth()
  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard summary for the panel (counts and recent activity)' })
  getDashboard(@CurrentUser() user: UserEntity) {
    return this.reportsService.getDashboard(user);
  }

  @Public()
  @Get('statistics')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Returns count of specimens, families, genera, species, and collectors. Public endpoint.',
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
  @Get('collector/:id')
  @ApiOperation({
    summary: 'Get specimens by collector',
    description: 'Returns specimens collected by a specific user. Requires ADMIN or COLLABORATOR role.',
  })
  @ApiParam({ name: 'id', description: 'Collector UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collector report retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Collector not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  getSpecimensByCollector(@Param('id') id: string) {
    return this.reportsService.getSpecimensByCollector(id);
  }
}
