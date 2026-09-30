import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
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
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'refresh-secret',
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
      },
    };
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    const user = await this.usersService.create(registerDto);
    return this.login(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'refresh-secret',
      });

      const user = await this.usersService.findOne(payload.sub);

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role?.name || 'VISITANTE',
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
      };
    } catch (error) {
      throw new BadRequestException('Sesión inválida o expirada');
    }
  }

  /**
   * Request password recovery - generates temporary password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña' };
    }

    // Generate 7-digit temporary password (like original HDUA)
    const tempPassword = Math.floor(1000000 + Math.random() * 9000000).toString();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user password
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Send email with temporary password
    await this.mailService.sendMail({
      to: email,
      subject: 'Recuperación de Contraseña - Herbario HDUA',
      html: `
        <h2>Recuperación de Contraseña</h2>
        <p>Hola ${user.name},</p>
        <p>Tu contraseña temporal es: <strong>${tempPassword}</strong></p>
        <p>Por favor, inicia sesión y cambia tu contraseña inmediatamente.</p>
        <p>Si no solicitaste este cambio, contacta al administrador.</p>
        <br>
        <p>Herbario Digital - Universidad de la Amazonia</p>
      `,
    });

    return { message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña' };
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
