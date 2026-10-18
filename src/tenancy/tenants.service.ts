/**
 * Búsqueda de herbarios en la base master, con caché corto: se consulta en CADA petición.
 * Un cambio de estado (suspender) tarda como mucho CACHE_TTL_MS en aplicarse, o es inmediato
 * si se llama a invalidate().
 */

import { Injectable } from '@nestjs/common';
import { Herbarium } from '.prisma/master-client';
import { MasterPrismaService } from './master-prisma.service';

const CACHE_TTL_MS = 30_000;
/** Los que no existen se recuerdan menos tiempo (y evitan martillar la master con basura) */
const MISS_TTL_MS = 5_000;
const MAX_CACHE = 1_000;

@Injectable()
export class TenantsService {
  private readonly cache = new Map<
    string,
    { herbarium: Herbarium | null; expires: number }
  >();

  constructor(private readonly master: MasterPrismaService) {}

  async findBySlug(slug: string): Promise<Herbarium | null> {
    const hit = this.cache.get(slug);
    if (hit && hit.expires > Date.now()) return hit.herbarium;

    const herbarium = await this.master.herbarium.findUnique({
      where: { slug },
    });
    if (this.cache.size >= MAX_CACHE) this.cache.clear();
    this.cache.set(slug, {
      herbarium,
      expires: Date.now() + (herbarium ? CACHE_TTL_MS : MISS_TTL_MS),
    });
    return herbarium;
  }

  invalidate(slug?: string) {
    if (slug) this.cache.delete(slug);
    else this.cache.clear();
  }
}
