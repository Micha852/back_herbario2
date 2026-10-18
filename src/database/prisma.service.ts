import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantClientsService } from '../tenancy/tenant-clients.service';

/**
 * Base de datos del HERBARIO de la petición en curso (multitenant).
 *
 * Se usa igual que un PrismaClient (this.prisma.specimen.findMany(), $transaction…), pero
 * cada acceso va al cliente de la base del herbario que resolvió TenantMiddleware. Así los
 * servicios no cambian y no pueden equivocarse de herbario. Fuera de una petición de
 * herbario (arranque, tareas programadas) lanza error: usar TenantClientsService.forDatabase().
 */
// Propiedades que Nest, las promesas o la consola consultan en cualquier objeto: se
// responden aquí, sin buscar un herbario (que no existe al arrancar la app)
const OWN_KEYS = new Set<PropertyKey>([
  'then',
  'constructor',
  'onModuleInit',
  'onModuleDestroy',
  'onApplicationBootstrap',
  'beforeApplicationShutdown',
  'onApplicationShutdown',
  'toJSON',
  'inspect',
]);

@Injectable()
// Clase + interfaz con el mismo nombre (abajo): a propósito, para tener los tipos de PrismaClient
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class PrismaService {
  constructor(private readonly tenantClients: TenantClientsService) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol' || OWN_KEYS.has(prop) || prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        const client = target.tenantClients.current();
        const value = Reflect.get(client, prop, client);
        return typeof value === 'function' ? value.bind(client) : value;
      },
    });
  }
}

// Mismos tipos que PrismaClient (this.prisma.user, $transaction, $queryRaw…)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging
export interface PrismaService extends PrismaClient {}
