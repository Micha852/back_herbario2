import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserEntity } from '../../users/entities/user.entity';
import {
  CompleteChairaAccountDto,
  SendChairaCodeDto,
} from './complete-account.dto';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { ChairaService } from './chaira.service';
import { DEVICE_KEY_PATTERN } from './chaira.constants';

@ApiTags('Auth')
// UserEntity oculta la contraseña al serializar (igual que AuthController)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth/chaira')
export class ChairaController {
  constructor(private readonly chaira: ChairaService) {}

  @Public()
  @Get('status')
  @ApiOperation({
    summary: 'Si el ingreso con Chairá está habilitado (para mostrar el botón)',
  })
  status() {
    return { enabled: this.chaira.enabled };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('start')
  @ApiOperation({
    summary: 'Redirige a la página de inicio de sesión de Chairá',
  })
  @ApiQuery({
    name: 'device',
    required: false,
    description: 'Llave del navegador (para recuperar la misma cuenta)',
  })
  start(@Query('device') device: string | undefined, @Res() res: Response) {
    if (!this.chaira.enabled)
      throw new NotFoundException('El ingreso con Chairá no está habilitado');
    if (device && !DEVICE_KEY_PATTERN.test(device))
      throw new BadRequestException('Llave de dispositivo no válida');
    res.redirect(this.chaira.authorizationUrl(device));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // cada código es un correo enviado
  @Post('complete/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Enviar código de verificación al correo con el que se completará la cuenta',
  })
  sendCode(@CurrentUser() user: UserEntity, @Body() dto: SendChairaCodeDto) {
    return this.chaira.sendCompleteCode(user.id, dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar correo y contraseña a una cuenta creada con Chairá',
    description:
      'Después puede entrar con el login normal desde cualquier navegador.',
  })
  complete(
    @CurrentUser() user: UserEntity,
    @Body() dto: CompleteChairaAccountDto,
  ) {
    return this.chaira.completeAccount(user.id, dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('callback')
  @ApiOperation({
    summary: 'Regreso desde Chairá: inicia sesión y vuelve al front',
  })
  async callback(
    @Query('state') state: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    if (!this.chaira.enabled)
      return res.redirect(this.chaira.errorUrl('error'));
    res.redirect(await this.chaira.handleCallback(state, code));
  }
}
