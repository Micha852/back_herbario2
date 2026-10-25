import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ParseIdPipe } from '../common/utils/id.util';
import { HerbariaService } from './herbaria.service';
import {
  PlatformAdminView,
  PlatformAuthGuard,
  PlatformAuthService,
} from './platform-auth';
import {
  CreateHerbariumDto,
  PlatformLoginDto,
  RetryHerbariumDto,
  UpdateHerbariumDto,
} from './platform.dto';

/**
 * API de la plataforma (/api/v1/platform/…): no pertenece a ningún herbario
 * (TenantMiddleware la deja pasar sin resolver herbario).
 */
@ApiTags('Plataforma')
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly auth: PlatformAuthService,
    private readonly herbaria: HerbariaService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de administrador de la plataforma' })
  login(@Body() dto: PlatformLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Get('auth/me')
  me(@Req() req: Request) {
    return req.user as PlatformAdminView;
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Get('herbaria')
  @ApiOperation({ summary: 'Herbarios de la plataforma' })
  list() {
    return this.herbaria.list();
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Get('herbaria/:id')
  findOne(@Param('id', ParseIdPipe) id: string) {
    return this.herbaria.findOne(id);
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Post('herbaria')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Crear un herbario (su base se crea en segundo plano)',
    description:
      'Responde 202 con el herbario en PROVISIONING y la contraseña temporal del primer administrador (solo esta vez). Consultar GET herbaria/:id hasta ACTIVE o FAILED.',
  })
  create(@Body() dto: CreateHerbariumDto) {
    return this.herbaria.create(dto);
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Post('herbaria/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Reintentar la creación de un herbario FAILED' })
  retry(@Param('id', ParseIdPipe) id: string, @Body() dto: RetryHerbariumDto) {
    return this.herbaria.retry(id, dto.adminEmail, dto.adminName);
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Patch('herbaria/:id')
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateHerbariumDto,
  ) {
    return this.herbaria.update(id, dto);
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Post('herbaria/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender (sin acceso; los datos se conservan)' })
  suspend(@Param('id', ParseIdPipe) id: string) {
    return this.herbaria.suspend(id);
  }

  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  @Post('herbaria/:id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id', ParseIdPipe) id: string) {
    return this.herbaria.activate(id);
  }
}
