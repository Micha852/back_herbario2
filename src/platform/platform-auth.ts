/**
 * Autenticación de los administradores de la PLATAFORMA (base master), separada de la de los
 * herbarios: otro tipo de token (typ: 'platform') y otra estrategia. Un token de herbario no
 * sirve aquí (no tiene typ) y uno de plataforma no sirve en un herbario (no tiene hb).
 */

import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { normalizeEmail } from '../common/utils/email.util';
import { MasterPrismaService } from '../tenancy/master-prisma.service';

export interface PlatformJwtPayload {
  sub: string;
  email: string;
  typ: 'platform';
}

export interface PlatformAdminView {
  id: string;
  email: string;
  name: string;
}

const PLATFORM_TOKEN_TTL = '8h';

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor(
    config: ConfigService,
    private readonly master: MasterPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: PlatformJwtPayload): Promise<PlatformAdminView> {
    if (payload.typ !== 'platform') throw new UnauthorizedException();
    const admin = await this.master.platformAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, isActive: true },
    });
    if (!admin?.isActive) throw new UnauthorizedException();
    return { id: admin.id, email: admin.email, name: admin.name };
  }
}

@Injectable()
export class PlatformAuthGuard extends AuthGuard('platform-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly master: MasterPrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.master.platformAdmin.findUnique({
      where: { email: normalizeEmail(email) },
    });
    // Mismo mensaje si no existe o la contraseña no coincide (no revela qué correos existen)
    const valid =
      admin?.isActive && (await bcrypt.compare(password, admin.password));
    if (!admin || !valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    await this.master.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });
    const payload: PlatformJwtPayload = {
      sub: admin.id,
      email: admin.email,
      typ: 'platform',
    };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: PLATFORM_TOKEN_TTL }),
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }
}
