/**
 * Ingreso con Chairá (plataforma de la Universidad de la Amazonia), como en HDUA 1.0.
 *
 * Limitación conocida: Chairá solo confirma que la persona inició sesión allá (devuelve
 * un `code`), pero no dice quién es, y no tenemos endpoint para canjear ese código.
 * Por eso:
 * - Las cuentas son "Visitante Chairá N", siempre con rol VISITANTE (consultar y comentar).
 * - Para no crear una cuenta nueva en cada ingreso, el navegador guarda una llave aleatoria;
 *   si vuelve a entrar desde el mismo navegador, recupera su misma cuenta.
 * - El `state` va firmado y con vencimiento: el regreso solo se acepta si salió de aquí.
 * - Se puede apagar quitando CHAIRA_CLIENT_ID del .env.
 * Ver ROADMAP_GENERAL.md (ideas futuras) para la versión completa con OAuth2.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PasswordUtil } from '../../../common/utils/password.util';
import { CompleteChairaAccountDto } from './complete-account.dto';
import { EmailVerificationService } from '../email-verification.service';

const COMPLETE_PURPOSE = 'chaira-complete';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { AuthService } from '../auth.service';
import { CHAIRA_EMAIL_DOMAIN, hashDeviceKey } from './chaira.constants';

const DEFAULT_AUTH_URL =
  'https://chaira.uniamazonia.edu.co/ChairaApi/oauth2/auth';
const STATE_AUDIENCE = 'chaira-state';

interface StatePayload {
  /** Hash de la llave del navegador (si mandó una) */
  k?: string;
  n: string;
}

@Injectable()
export class ChairaService {
  private readonly logger = new Logger(ChairaService.name);

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private users: UsersService,
    private auth: AuthService,
    private verification: EmailVerificationService,
  ) {}

  get enabled(): boolean {
    return !!this.config.get<string>('CHAIRA_CLIENT_ID');
  }

  private get appUrl() {
    return (
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  /** URL de Chairá a la que se manda al usuario */
  authorizationUrl(deviceKey?: string): string {
    const state = this.jwt.sign(
      {
        k: deviceKey ? hashDeviceKey(deviceKey) : undefined,
        n: randomBytes(8).toString('hex'),
      } satisfies StatePayload,
      { audience: STATE_AUDIENCE, expiresIn: '10m' },
    );
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.getOrThrow<string>('CHAIRA_CLIENT_ID'),
      redirect_uri:
        this.config.get<string>('CHAIRA_REDIRECT_URI') ??
        'http://localhost:4000/api/v1/auth/chaira/callback',
      state,
    });
    return `${this.config.get<string>('CHAIRA_AUTH_URL') ?? DEFAULT_AUTH_URL}?${params}`;
  }

  /** URL del front a la que se vuelve con un error legible */
  errorUrl(reason: 'cancelado' | 'invalido' | 'desactivada' | 'error'): string {
    return `${this.appUrl}/login?chaira=${reason}`;
  }

  /**
   * Regreso desde Chairá: valida el state, recupera o crea la cuenta y devuelve la URL del
   * front con los tokens en el fragmento (#), que el navegador no envía a ningún servidor.
   */
  async handleCallback(state?: string, code?: string): Promise<string> {
    let payload: StatePayload;
    try {
      payload = this.jwt.verify<StatePayload>(state ?? '', {
        audience: STATE_AUDIENCE,
      });
    } catch {
      return this.errorUrl('invalido');
    }
    if (!code) return this.errorUrl('cancelado');

    try {
      const existing = payload.k
        ? await this.prisma.user.findUnique({
            where: { chairaKeyHash: payload.k },
            select: { id: true, isActive: true },
          })
        : null;
      if (existing && !existing.isActive) return this.errorUrl('desactivada');

      const userId = existing?.id ?? (await this.createVisitor(payload.k));
      const tokens = await this.auth.login(await this.users.findOne(userId));
      const fragment = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return `${this.appUrl}/login/chaira#${fragment}`;
    } catch (error) {
      this.logger.error(
        `Ingreso con Chairá falló: ${(error as Error).message}`,
      );
      return this.errorUrl('error');
    }
  }

  /**
   * Convierte una cuenta de Chairá (sin contraseña) en una cuenta normal: correo real +
   * contraseña. Así la persona entra desde cualquier navegador con el login normal y
   * conserva sus comentarios. Solo para cuentas de Chairá que aún no tienen contraseña.
   */
  async completeAccount(userId: string, dto: CompleteChairaAccountDto) {
    await this.assertCanComplete(userId, dto.email);
    // El correo debe ser de quien lo escribe: se exige el código que le llegó
    await this.verification.verify({
      userId,
      email: dto.email,
      purpose: COMPLETE_PURPOSE,
      code: dto.code,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email,
        password: await PasswordUtil.hash(dto.password),
        ...(dto.name && { name: dto.name }),
      },
    });
    return this.users.findOne(userId);
  }

  /** Paso 1: envía un código de 6 dígitos al correo que la persona quiere usar */
  async sendCompleteCode(userId: string, email: string) {
    const user = await this.assertCanComplete(userId, email);
    await this.verification.send({
      userId,
      email,
      purpose: COMPLETE_PURPOSE,
      name: user.name,
      action: 'completar tu cuenta del Herbario',
    });
    return { message: `Te enviamos un código a ${email}` };
  }

  /** Revisa que la cuenta pueda completarse y que el correo nuevo sirva */
  private async assertCanComplete(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, password: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.email.endsWith(`@${CHAIRA_EMAIL_DOMAIN}`) || user.password) {
      throw new BadRequestException('Esta cuenta ya tiene correo y contraseña');
    }
    if (email.endsWith(`@${CHAIRA_EMAIL_DOMAIN}`)) {
      throw new BadRequestException('Usa un correo real');
    }
    const taken = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken) throw new ConflictException('El correo ya está registrado');
    return user;
  }

  /** Crea "Visitante Chairá N" (siguiente número libre) */
  private async createVisitor(keyHash?: string): Promise<string> {
    const [role, institution, count] = await Promise.all([
      this.prisma.role.findUniqueOrThrow({ where: { name: UserRole.VISITOR } }),
      this.prisma.institution.findFirst({
        where: { name: { contains: 'Amazonia', mode: 'insensitive' } },
      }),
      this.prisma.user.count({
        where: { email: { endsWith: `@${CHAIRA_EMAIL_DOMAIN}` } },
      }),
    ]);

    // Si otro ingreso tomó el mismo número al mismo tiempo, se prueba el siguiente
    for (let n = count + 1; n < count + 20; n++) {
      try {
        const user = await this.prisma.user.create({
          data: {
            name: `Visitante Chairá ${n}`,
            email: `visitante.chaira.${n}@${CHAIRA_EMAIL_DOMAIN}`,
            password: null,
            roleId: role.id,
            institutionId: institution?.id,
            chairaKeyHash: keyHash ?? null,
          },
          select: { id: true },
        });
        return user.id;
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
    }
    throw new Error('No se pudo asignar un número de visitante');
  }
}
