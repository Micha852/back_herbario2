import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from './permissions.constants';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

/**
 * Verifica @RequirePermissions contra los permisos efectivos del usuario
 * (calculados en JwtStrategy.validate en cada petición, así que los cambios
 * que haga el admin aplican de inmediato, sin volver a iniciar sesión).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user;
    const granted: string[] = user?.permissions ?? [];
    if (required.some((permission) => granted.includes(permission)))
      return true;

    throw new ForbiddenException('No tienes permiso para realizar esta acción');
  }
}
