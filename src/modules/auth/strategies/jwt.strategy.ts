import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { TenantContext } from '../../../tenancy/tenant-context';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** Herbario (slug) donde se inició la sesión: el token solo sirve en ese herbario */
  hb: string;
}

/** Slug del herbario de la petición (para firmar tokens); error si no hay herbario */
export function currentHerbariumSlug(): string {
  const tenant = TenantContext.current();
  if (!tenant) throw new UnauthorizedException();
  return tenant.slug;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private permissionsService: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Una sesión de un herbario no sirve en otro (mismo secreto JWT para toda la plataforma)
    if (!payload.hb || payload.hb !== TenantContext.current()?.slug) {
      throw new UnauthorizedException();
    }
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    // Permisos efectivos en cada petición: los cambios del admin aplican al instante
    user.permissions = await this.permissionsService.getEffectivePermissions(
      user.id,
      user.role?.name,
    );
    return user;
  }
}
