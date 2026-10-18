/**
 * Un PrismaClient por base de herbario, en un pool LRU (como en Contagracia): abrir un cliente
 * por petición sería lento y dejar todos abiertos agota las conexiones de Postgres.
 */

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant-context';
import { tenantDatabaseUrl } from './tenant-url';

/** Al salir del pool, el cliente se cierra después de esto (por si aún atiende peticiones) */
const DISCONNECT_DELAY_MS = 30_000;

@Injectable()
export class TenantClientsService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantClientsService.name);
  /** dbName → cliente; el orden de inserción es el orden de uso (LRU) */
  private readonly clients = new Map<string, PrismaClient>();
  private readonly baseUrl: string;
  private readonly poolSize: number;
  private readonly connectionLimit: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('DATABASE_URL');
    this.poolSize = Number(config.get('TENANT_POOL_SIZE') ?? 50);
    this.connectionLimit = Number(config.get('TENANT_CONNECTION_LIMIT') ?? 5);
  }

  /** Cliente de la base del herbario de la petición en curso */
  current(): PrismaClient {
    const tenant = TenantContext.current();
    if (!tenant) {
      // Un error de programación: se usó la base de un herbario fuera de una petición de herbario
      throw new InternalServerErrorException(
        'No hay un herbario en el contexto de esta operación',
      );
    }
    return this.forDatabase(tenant.dbName);
  }

  forDatabase(dbName: string): PrismaClient {
    const existing = this.clients.get(dbName);
    if (existing) {
      // Recién usado: al final
      this.clients.delete(dbName);
      this.clients.set(dbName, existing);
      return existing;
    }

    const client = new PrismaClient({
      datasources: {
        db: {
          url: tenantDatabaseUrl(this.baseUrl, dbName, this.connectionLimit),
        },
      },
      log: ['error', 'warn'],
      errorFormat: 'minimal',
    });
    this.clients.set(dbName, client);
    this.evictIfNeeded();
    return client;
  }

  /** Cierra y saca del pool el cliente de una base (p. ej. al suspender o borrar un herbario) */
  async release(dbName: string): Promise<void> {
    const client = this.clients.get(dbName);
    if (!client) return;
    this.clients.delete(dbName);
    await client.$disconnect();
  }

  get size(): number {
    return this.clients.size;
  }

  private evictIfNeeded() {
    while (this.clients.size > this.poolSize) {
      const [oldest, client] = this.clients.entries().next().value as [
        string,
        PrismaClient,
      ];
      this.clients.delete(oldest);
      setTimeout(() => {
        client
          .$disconnect()
          .catch((error: Error) =>
            this.logger.warn(`Cerrando ${oldest}: ${error.message}`),
          );
      }, DISCONNECT_DELAY_MS).unref();
    }
  }

  async onModuleDestroy() {
    await Promise.all(
      [...this.clients.values()].map((client) => client.$disconnect()),
    );
    this.clients.clear();
  }
}
