import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { TenantClientsService } from './tenant-clients.service';
import { TenantContext, TenantInfo } from './tenant-context';
import { TenantMiddleware } from './tenant.middleware';
import { isValidSlug, slugFromHost } from './tenant-slug';
import { tenantDatabaseUrl } from './tenant-url';
import { TenantsService } from './tenants.service';

const HUAZ: TenantInfo = {
  id: 'h1',
  slug: 'huaz',
  name: 'HUAZ',
  dbName: 'hdua_db',
};
const config = (values: Record<string, string>) =>
  ({
    get: (k: string) => values[k],
    getOrThrow: (k: string) => values[k],
  }) as unknown as ConfigService;

describe('multitenant: slug y subdominio', () => {
  it('slugs válidos e inválidos', () => {
    expect(isValidSlug('huaz')).toBe(true);
    expect(isValidSlug('jardin-botanico')).toBe(true);
    for (const bad of [
      '',
      'a',
      '-huaz',
      'huaz-',
      'HUAZ',
      'hu_az',
      'www',
      'admin',
      'api',
      'x'.repeat(41),
    ]) {
      expect(isValidSlug(bad)).toBe(false);
    }
  });

  it('slug desde el Host', () => {
    expect(slugFromHost('huaz.herbaria.co', 'herbaria.co')).toBe('huaz');
    expect(slugFromHost('HUAZ.Herbaria.co:443', 'herbaria.co')).toBe('huaz');
    expect(slugFromHost('coah.localhost:3000', 'localhost')).toBe('coah');
    // No son herbarios: el dominio raíz, www, dos niveles u otro dominio
    expect(slugFromHost('herbaria.co', 'herbaria.co')).toBeUndefined();
    expect(slugFromHost('www.herbaria.co', 'herbaria.co')).toBeUndefined();
    expect(slugFromHost('a.b.herbaria.co', 'herbaria.co')).toBeUndefined();
    expect(slugFromHost('huaz.otro.co', 'herbaria.co')).toBeUndefined();
    expect(slugFromHost('evilherbaria.co', 'herbaria.co')).toBeUndefined();
    expect(slugFromHost('huaz.herbaria.co', undefined)).toBeUndefined();
  });

  it('URL de la base de cada herbario: mismo servidor, otra base', () => {
    const url = tenantDatabaseUrl(
      'postgresql://u:p%40ss@db:5432/plantilla?schema=public',
      'herbario_coah',
      5,
    );
    expect(url).toBe(
      'postgresql://u:p%40ss@db:5432/herbario_coah?schema=public&connection_limit=5',
    );
  });
});

describe('multitenant: pool de conexiones', () => {
  const pool = (size: number) =>
    new TenantClientsService(
      config({
        DATABASE_URL: 'postgresql://u:p@localhost:5432/x',
        TENANT_POOL_SIZE: String(size),
      }),
    );

  it('reutiliza el cliente de cada base y respeta el tope (LRU)', () => {
    const clients = pool(2);
    const a = clients.forDatabase('a');
    expect(clients.forDatabase('a')).toBe(a);
    clients.forDatabase('b');
    clients.forDatabase('a'); // a recién usado → el más viejo es b
    clients.forDatabase('c');
    expect(clients.size).toBe(2);
    expect(clients.forDatabase('a')).toBe(a);
  });

  it('fuera de una petición de herbario no hay base (error, no un herbario cualquiera)', () => {
    expect(() => pool(2).current()).toThrow(InternalServerErrorException);
  });
});

describe('multitenant: PrismaService', () => {
  const fake = {
    specimen: { name: 'specimens' },
    $transaction: function () {
      return this;
    },
  };
  const clients = {
    current: jest.fn(() => fake),
  } as unknown as TenantClientsService;
  const prisma = new PrismaService(clients) as unknown as typeof fake;

  it('cada acceso va a la base del herbario en curso (y $transaction queda atado a ella)', () => {
    expect(prisma.specimen).toBe(fake.specimen);
    expect(prisma.$transaction()).toBe(fake);
  });

  it('Nest y las promesas pueden inspeccionarlo sin herbario (arranque de la app)', () => {
    const noTenant = new PrismaService({
      current: () => {
        throw new Error('sin herbario');
      },
    } as unknown as TenantClientsService) as unknown as Record<string, unknown>;
    expect(noTenant.then).toBeUndefined();
    expect(noTenant.onModuleInit).toBeUndefined();
    expect(() => noTenant.specimen).toThrow('sin herbario');
  });
});

describe('multitenant: middleware', () => {
  const herbaria: Record<string, object> = {
    huaz: {
      id: 'h1',
      slug: 'huaz',
      name: 'HUAZ',
      dbName: 'hdua_db',
      status: 'ACTIVE',
    },
    coah: {
      id: 'h2',
      slug: 'coah',
      name: 'COAH',
      dbName: 'herbario_coah',
      status: 'SUSPENDED',
    },
    nuevo: {
      id: 'h3',
      slug: 'nuevo',
      name: 'Nuevo',
      dbName: 'herbario_nuevo',
      status: 'PROVISIONING',
    },
  };
  const tenants = {
    findBySlug: jest.fn(async (s: string) => herbaria[s] ?? null),
  } as unknown as TenantsService;
  const middleware = (env: Record<string, string> = {}) =>
    new TenantMiddleware(
      tenants,
      config({ PLATFORM_DOMAIN: 'herbaria.co', ...env }),
    );

  const call = async (
    mw: TenantMiddleware,
    req: { url?: string; host?: string; header?: string },
  ) => {
    let status = 0;
    let seen: TenantInfo | undefined;
    const res = { status: (s: number) => ((status = s), res), json: () => res };
    await mw.use(
      {
        originalUrl: req.url ?? '/api/v1/specimens',
        headers: {
          host: req.host ?? 'localhost:4000',
          ...(req.header && { 'x-herbario': req.header }),
        },
      } as never,
      res as never,
      () => (seen = TenantContext.current()),
    );
    return { status, seen };
  };

  it('subdominio → herbario en el contexto', async () => {
    const { seen } = await call(middleware(), { host: 'huaz.herbaria.co' });
    expect(seen).toEqual(HUAZ);
  });

  it('cabecera X-Herbario y valor por defecto', async () => {
    expect((await call(middleware(), { header: 'huaz' })).seen?.slug).toBe(
      'huaz',
    );
    expect(
      (await call(middleware({ DEFAULT_HERBARIUM: 'huaz' }), {})).seen?.slug,
    ).toBe('huaz');
  });

  it('sin herbario o inexistente → 404', async () => {
    expect((await call(middleware(), {})).status).toBe(404);
    expect((await call(middleware(), { header: 'no-existe' })).status).toBe(
      404,
    );
  });

  it('suspendido → 403; preparándose → 503', async () => {
    expect((await call(middleware(), { header: 'coah' })).status).toBe(403);
    expect((await call(middleware(), { header: 'nuevo' })).status).toBe(503);
  });

  it('rutas de la plataforma (health) no necesitan herbario', async () => {
    const { status, seen } = await call(middleware(), {
      url: '/api/v1/health',
    });
    expect(status).toBe(0);
    expect(seen).toBeUndefined();
  });
});
