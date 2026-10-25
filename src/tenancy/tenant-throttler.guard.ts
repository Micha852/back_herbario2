import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TenantContext } from './tenant-context';

/**
 * Límite de intentos por IP *y por herbario*: los visitantes de un herbario no gastan el cupo
 * de otro (p. ej. un campus entero detrás de una sola IP). Las rutas de la plataforma cuentan
 * aparte.
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = await super.getTracker(req);
    return `${TenantContext.current()?.slug ?? 'plataforma'}|${ip}`;
  }
}
