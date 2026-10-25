import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HerbariaService } from './herbaria.service';
import {
  PlatformAuthGuard,
  PlatformAuthService,
  PlatformJwtStrategy,
} from './platform-auth';
import { PlatformController } from './platform.controller';
import { ProvisioningService } from './provisioning.service';

/** Panel de la plataforma: administradores de plataforma y herbarios (base master) */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PlatformController],
  providers: [
    PlatformJwtStrategy,
    PlatformAuthGuard,
    PlatformAuthService,
    HerbariaService,
    ProvisioningService,
  ],
})
export class PlatformModule {}
