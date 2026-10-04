import { CHAIRA_EMAIL_DOMAIN } from './chaira/chaira.constants';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { escapeHtml } from '../../common/utils/html.util';
import { PermissionsService } from '../permissions/permissions.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto, RegisterWithCodeDto } from './dto/register.dto';
import { EmailVerificationService } from './email-verification.service';

const REGISTER_PURPOSE = 'register';
import { LoginResponseDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private permissionsService: PermissionsService,
    private emailVerification: EmailVerificationService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserEntity | null> {
    return this.usersService.validateCredentials(email, password);
  }

  /**
   * Login user and generate tokens
   */
  async login(user: UserEntity): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name || 'VISITANTE',
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn:
        this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || 'VISITANTE',
        permissions: await this.permissionsService.getEffectivePermissions(
          user.id,
          user.role?.name,
        ),
      },
    };
  }

  /**
   * Register a new user
   */
  /**
   * Registro, paso 1: valida que el correo esté libre y le envía un código.
   * La cuenta todavía no se crea (no quedan cuentas sin verificar).
   */
  async sendRegisterCode(dto: RegisterDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    await this.usersService.assertEmailFree(email);
    await this.emailVerification.send({
      email,
      purpose: REGISTER_PURPOSE,
      name: dto.name,
      action: 'crear tu cuenta en el Herbario',
    });
    return { message: `Te enviamos un código a ${email}` };
  }

  /** Registro, paso 2: con el código correcto se crea la cuenta y se inicia sesión */
  async register(dto: RegisterWithCodeDto): Promise<LoginResponseDto> {
    const { code, ...data } = dto;
    await this.emailVerification.verify({
      email: dto.email.trim().toLowerCase(),
      purpose: REGISTER_PURPOSE,
      code,
    });
    const user = await this.usersService.create(data);
    return this.login(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findOne(payload.sub);
      // Un usuario desactivado no puede renovar su sesión
      if (!user.isActive) throw new Error('inactive');

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role?.name || 'VISITANTE',
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
      };
    } catch (error) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }

  /**
   * Request password recovery - generates temporary password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return {
        message:
          'Si el correo existe, recibirás instrucciones para recuperar tu contraseña',
      };
    }

    const genericMessage = {
      message:
        'Si el correo existe, recibirás instrucciones para recuperar tu contraseña',
    };

    // Cuentas de Chairá: no tienen contraseña ni correo real (entran solo por Chairá)
    if (user.email.endsWith(`@${CHAIRA_EMAIL_DOMAIN}`)) return genericMessage;

    // Contraseña temporal de 7 dígitos (como en HDUA 1.0), con generador criptográfico
    const tempPassword = randomInt(1000000, 10000000).toString();

    // Primero el correo: si no sale, NO se cambia la contraseña (el usuario no queda bloqueado)
    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Recuperación de contraseña - Herbario HUAZ',
        html: `
          <h2>Recuperación de contraseña</h2>
          <p>Hola ${escapeHtml(user.name)},</p>
          <p>Tu contraseña temporal es: <strong>${tempPassword}</strong></p>
          <p>Inicia sesión y cámbiala desde "Mi perfil".</p>
          <p>Tu contraseña anterior ya no funciona. Si no solicitaste este cambio, contacta al administrador del herbario.</p>
          <br>
          <p>Herbario Digital - Universidad de la Amazonia</p>
        `,
      });
    } catch {
      // Ya quedó registrado en MailService; misma respuesta para no revelar si el correo existe
      return genericMessage;
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    await this.usersService.updatePassword(user.id, hashedPassword);

    return genericMessage;
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Verify current password (for profile security)
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    return bcrypt.compare(password, user.password);
  }
}
