/**
 * Herbario de la petición en curso (multitenant).
 *
 * El middleware de tenancy resuelve el herbario (subdominio, cabecera o valor por defecto) y
 * ejecuta el resto de la petición dentro de este contexto (AsyncLocalStorage). Así
 * PrismaService sabe a qué base ir sin pasar el herbario por cada método.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  dbName: string;
}

const storage = new AsyncLocalStorage<TenantInfo>();

export const TenantContext = {
  /** Ejecuta fn con el herbario como contexto (y todo lo que fn llame, aunque sea async) */
  run<T>(tenant: TenantInfo, fn: () => T): T {
    return storage.run(tenant, fn);
  },

  /** Herbario de la petición, o undefined fuera de una petición de herbario */
  current(): TenantInfo | undefined {
    return storage.getStore();
  },
};
