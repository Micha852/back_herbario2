/**
 * Resuelve el herbario de cada petición y ejecuta el resto dentro de su contexto.
 *
 * Orden: 1) subdominio (<slug>.<PLATFORM_DOMAIN>, lo normal en producción detrás de nginx);
 *        2) cabecera X-Herbario (desarrollo: el front en :3000 llama al API en :4000);
 *        3) DEFAULT_HERBARIUM (desarrollo y pruebas con un solo herbario).
 * Elegir el herbario por cabecera equivale a visitar su subdominio: no da acceso a nada más.
 * Lo que protege los datos es que cada herbario tiene su base y que el JWT queda atado al
 * herbario (JwtStrategy).
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';
import { isValidSlug, slugFromHost } from './tenant-slug';
import { TenantsService } from './tenants.service';

export const TENANT_HEADER = 'x-herbario';

/** Rutas que no pertenecen a un herbario */
const PLATFORM_PATHS = ['/api/v1/health', '/api/docs', '/api/v1/platform'];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly platformDomain?: string;
  private readonly defaultSlug?: string;

  constructor(
    private readonly tenants: TenantsService,
    config: ConfigService,
  ) {
    this.platformDomain = config.get<string>('PLATFORM_DOMAIN') || undefined;
    this.defaultSlug = config.get<string>('DEFAULT_HERBARIUM') || undefined;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];
    if (PLATFORM_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      return next();
    }

    const header = req.headers[TENANT_HEADER];
    const slug = (
      slugFromHost(req.headers.host, this.platformDomain) ??
      (typeof header === 'string' ? header : undefined) ??
      this.defaultSlug
    )
      ?.trim()
      .toLowerCase();

    const notFound = () =>
      res.status(404).json({
        statusCode: 404,
        message: 'Herbario no encontrado',
        error: 'Not Found',
      });

    if (!slug || !isValidSlug(slug)) return notFound();

    let herbarium;
    try {
      herbarium = await this.tenants.findBySlug(slug);
    } catch (error) {
      return next(error);
    }
    if (!herbarium) return notFound();

    if (herbarium.status === 'SUSPENDED') {
      return res.status(403).json({
        statusCode: 403,
        message:
          'Este herbario está suspendido. Contacta al administrador de la plataforma.',
        error: 'Forbidden',
      });
    }
    if (herbarium.status !== 'ACTIVE') {
      return res.status(503).json({
        statusCode: 503,
        message: 'Este herbario se está preparando. Intenta en unos minutos.',
        error: 'Service Unavailable',
      });
    }

    TenantContext.run(
      {
        id: herbarium.id,
        slug: herbarium.slug,
        name: herbarium.name,
        dbName: herbarium.dbName,
      },
      () => next(),
    );
  }
}
