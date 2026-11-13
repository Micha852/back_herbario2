/**
 * Utilidades de los scripts multitenant (prisma/tenants/*). No importan src/ porque la imagen
 * de Docker solo lleva dist/ y prisma/: las reglas del slug y la URL de cada base están
 * copiadas de src/tenancy/tenant-slug.ts y tenant-url.ts (mantenerlas iguales).
 */

import { spawnSync } from 'child_process';
import { PrismaClient as MasterClient } from '.prisma/master-client';

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$/;
export const RESERVED_SLUGS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'panel',
  'plataforma',
  'platform',
  'mail',
  'smtp',
  'ftp',
  'static',
  'cdn',
  'assets',
  'status',
  'docs',
  'blog',
  'soporte',
  'support',
  'ayuda',
  'help',
  'dev',
  'test',
  'staging',
  'demo',
]);
export const isValidSlug = (slug: string) =>
  SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);

/** Nombre de base por defecto: herbario_<slug> (guiones → guiones bajos) */
export const defaultDbName = (slug: string) =>
  `herbario_${slug.replace(/-/g, '_')}`;
export const DB_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export function tenantDatabaseUrl(baseUrl: string, dbName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

export function baseDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) fail('Falta DATABASE_URL (servidor de las bases de los herbarios)');
  return url;
}

export const master = () => new MasterClient();

/** Ejecuta el CLI de Prisma contra una base (sin npx: funciona igual en Windows y en Docker) */
export function prisma(args: string[], databaseUrl: string): boolean {
  const cli = require.resolve('prisma/build/index.js');
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  return result.status === 0;
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]?.trim() : undefined;
}

export const flag = (name: string) => process.argv.includes(`--${name}`);

export function fail(message: string): never {
  throw new Error(message);
}

/** Corre main() mostrando los errores como ⛔ y con código de salida 1 */
export function run(main: () => Promise<void>) {
  main().catch((error: Error) => {
    console.error(`\n⛔ ${error.message}`);
    process.exitCode = 1;
  });
}

/**
 * Plantilla neutra de un herbario NUEVO (CMS con su nombre, sin el contador "HUAZ" de la
 * migración). Misma lógica que src/tenancy/default-content.ts; misma plantilla
 * (prisma/templates/herbarium-content.json).
 */
export async function applyDefaultContent(
  databaseUrl: string,
  name: string,
  contactEmail?: string | null,
) {
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const { PrismaClient } = await import('@prisma/client');
  const month = new Date().toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
  const vars: Record<string, string> = {
    nombre: name,
    correo: contactEmail ?? '',
    fecha: month.charAt(0).toUpperCase() + month.slice(1),
  };
  const fill = (value: unknown): unknown =>
    typeof value === 'string'
      ? value.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m)
      : Array.isArray(value)
        ? value.map(fill)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value).map(([k, v]) => [k, fill(v)]),
            )
          : value;
  const template = JSON.parse(
    readFileSync(
      join(__dirname, '..', 'templates', 'herbarium-content.json'),
      'utf8',
    ),
  ) as Record<string, { title: string; content: unknown }>;

  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    for (const [key, page] of Object.entries(template)) {
      const data = {
        title: page.title,
        content: JSON.stringify(fill(page.content), null, 2),
        isActive: true,
      };
      await db.systemInfo.upsert({
        where: { key },
        create: { key, ...data },
        update: data,
      });
    }
    await db.catalogCounter.deleteMany({
      where: { prefix: 'HUAZ', lastNumber: 0 },
    });
  } finally {
    await db.$disconnect();
  }
}
