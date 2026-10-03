import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { MailService } from './mail.service';
import { TestMailDto, UpdateMailSettingsDto } from './mail-settings.dto';

/** Servidor de correo (SMTP) del herbario: solo ADMINISTRADOR. La contraseña nunca se devuelve */
@ApiTags('Mail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('mail-settings')
export class MailSettingsController {
  constructor(private readonly mail: MailService) {}

  @Get()
  @ApiOperation({ summary: 'Configuración de correo (sin la contraseña)' })
  get() {
    return this.mail.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Guardar la configuración de correo' })
  update(@Body() dto: UpdateMailSettingsDto) {
    return this.mail.updateSettings(dto);
  }

  @Delete()
  @ApiOperation({
    summary: 'Borrar la configuración del panel (vuelve a la del servidor)',
  })
  clear() {
    return this.mail.clearSettings();
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Probar la conexión y enviar un correo de prueba al admin',
  })
  test(@CurrentUser() user: UserEntity, @Body() dto: TestMailDto) {
    return this.mail.sendTest(dto.to?.trim() || user.email);
  }
}
