import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ChairaController } from './chaira/chaira.controller';
import { ChairaService } from './chaira/chaira.service';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Obligatorio: validado al arrancar (src/config/env.validation.ts)
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<string>('JWT_EXPIRES_IN') ||
            configService.get<string>('JWT_EXPIRATION') ||
            '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ChairaController],
  providers: [
    AuthService,
    ChairaService,
    EmailVerificationService,
    LocalStrategy,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
