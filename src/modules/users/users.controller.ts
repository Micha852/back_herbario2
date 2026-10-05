import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UsersAdminService } from './users-admin.service';
import {
  AdminCreateUserDto,
  AdminListUsersQuery,
  AdminUpdateUserDto,
} from './dto/admin-user.dto';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { ParseIdPipe } from '../../common/utils/id.util';

/**
 * Gestión de usuarios: exclusiva del ADMINISTRADOR (no se delega como permiso),
 * excepto la lista pública de recolectores que usan los formularios.
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersAdminService: UsersAdminService,
  ) {}

  @Public()
  @Get('collectors')
  @ApiOperation({ summary: 'Recolectores activos (solo id y nombre)' })
  async getCollectors() {
    const collectors = await this.usersService.getCollectors();
    // Endpoint público: sin correos ni otros datos personales
    return collectors.map(({ id, name }) => ({ id, name }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar usuarios (búsqueda, filtros y paginación)' })
  @ApiQuery({ name: 'search', required: false, description: 'Nombre o correo' })
  @ApiQuery({ name: 'role', required: false, enum: Object.values(UserRole) })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isCollector', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@Query() query: AdminListUsersQuery) {
    return this.usersAdminService.list(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Crear usuario',
    description:
      'Sin contraseña: se genera una temporal, se envía por correo y se devuelve una sola vez.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El correo ya está registrado',
  })
  create(@Body() dto: AdminCreateUserDto) {
    return this.usersAdminService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario' })
  findOne(@Param('id', ParseIdPipe) id: string) {
    return this.usersAdminService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Editar usuario (rol, recolector, estado...)',
    description:
      'Un admin no puede quitarse su rol ni desactivarse, y siempre debe quedar al menos un admin activo.',
  })
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.usersAdminService.update(id, dto, admin.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Restablecer contraseña (genera una temporal y la envía por correo)',
  })
  resetPassword(@Param('id', ParseIdPipe) id: string) {
    return this.usersAdminService.resetPassword(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Desactivar usuario (equivale a PATCH isActive=false)',
  })
  async remove(
    @Param('id', ParseIdPipe) id: string,
    @CurrentUser() admin: UserEntity,
  ) {
    await this.usersAdminService.update(id, { isActive: false }, admin.id);
    return { message: 'Usuario desactivado' };
  }
}
