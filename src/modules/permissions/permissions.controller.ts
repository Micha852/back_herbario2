import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { PermissionsService } from './permissions.service';

class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];
}

/**
 * Gestión de permisos: exclusiva del ADMINISTRADOR (no se delega como permiso).
 */
@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de permisos y permisos por defecto de cada rol' })
  getCatalog() {
    return this.permissionsService.getCatalog();
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Permisos de un usuario (defaults del rol, ajustes y efectivos)' })
  getUserPermissions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.getUserPermissions(userId);
  }

  @Put('users/:userId')
  @ApiOperation({ summary: 'Define los permisos efectivos de un colaborador' })
  setUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetPermissionsDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.permissionsService.setUserPermissions(userId, dto.permissions, admin.id);
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Vuelve a los permisos por defecto del rol' })
  resetUserPermissions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.resetUserPermissions(userId);
  }
}
