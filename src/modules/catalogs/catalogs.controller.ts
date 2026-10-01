import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { hasPermission } from '../permissions/permissions.logic';
import { CatalogsService } from './catalogs.service';

/**
 * Gestión de catálogos desde el panel (taxonomía, morfología, ecología, ubicaciones, proyectos).
 * Las lecturas públicas que usan los formularios siguen en /taxonomy, /locations, /projects...
 */
@ApiTags('Catalogs')
@ApiBearerAuth()
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR)
  @Get()
  @ApiOperation({
    summary: 'Definiciones de los catálogos (campos, jerarquía, uso)',
  })
  getDefinitions() {
    return this.catalogsService.getDefinitions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR)
  @Get(':type')
  @ApiOperation({
    summary: 'Listar elementos de un catálogo (con conteo de uso)',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @Param('type') type: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogsService.list(type, {
      search,
      parentId,
      includeInactive: includeInactive === 'true',
      page: page ? Number(page) || 1 : undefined,
      limit: limit ? Number(limit) || undefined : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLLABORATOR)
  @Get(':type/:id')
  @ApiOperation({ summary: 'Obtener un elemento' })
  findOne(@Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalogsService.findOne(type, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE)
  @Post(':type')
  @ApiOperation({ summary: 'Crear elemento (catalogs.manage)' })
  create(@Param('type') type: string, @Body() body: Record<string, unknown>) {
    return this.catalogsService.create(type, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_MANAGE, PERMISSIONS.CATALOGS_DELETE)
  @Patch(':type/:id')
  @ApiOperation({
    summary:
      'Editar elemento (catalogs.manage); isActive requiere catalogs.delete',
  })
  async update(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: UserEntity,
  ) {
    const fields = Object.keys(body ?? {}).filter((key) => key !== 'isActive');
    if (
      fields.length > 0 &&
      !hasPermission(user.permissions, PERMISSIONS.CATALOGS_MANAGE)
    ) {
      throw new ForbiddenException('No tienes permiso para editar catálogos');
    }
    return this.catalogsService.update(
      type,
      id,
      body,
      hasPermission(user.permissions, PERMISSIONS.CATALOGS_DELETE),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOGS_DELETE)
  @Delete(':type/:id')
  @ApiOperation({
    summary: 'Eliminar elemento si no está en uso (catalogs.delete)',
  })
  remove(@Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalogsService.remove(type, id);
  }
}
