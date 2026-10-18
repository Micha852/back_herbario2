/**
 * Prepara la plataforma para los tests e2e: master de pruebas + DOS herbarios con datos de
 * prueba (para probar que no se ven entre sí). Idempotente: se puede correr siempre.
 *
 *   DATABASE_URL=".../herbario_e2e"  MASTER_DATABASE_URL=".../herbario_master_e2e"  \
 *     npm run tenants:setup-test
 *
 * Herbarios: "e2e" (base de DATABASE_URL) y "e2e-b" (esa base + "_b"). Las dos se reinician
 * con el seed (BORRA TODO). Por seguridad solo corre si TODAS las bases se llaman *test*,
 * *e2e* o *ci*.
 */

import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'child_process';
import * as path from 'path';
import {
  baseDatabaseUrl,
  fail,
  master,
  prisma,
  run,
  tenantDatabaseUrl,
} from './lib';

const SAFE = /test|e2e|ci/i;
const dbNameOf = (url: string) => new URL(url).pathname.slice(1);

run(async () => {
  const base = baseDatabaseUrl();
  const masterUrl =
    process.env.MASTER_DATABASE_URL ?? fail('Falta MASTER_DATABASE_URL');
  const mainDb = dbNameOf(base);
  const herbaria = [
    { slug: 'e2e', name: 'Herbario E2E', dbName: mainDb },
    { slug: 'e2e-b', name: 'Herbario E2E B', dbName: `${mainDb}_b` },
  ];
  for (const name of [dbNameOf(masterUrl), ...herbaria.map((h) => h.dbName)]) {
    if (!SAFE.test(name))
      fail(
        `"${name}" no parece una base de pruebas (debe contener test, e2e o ci)`,
      );
  }

  console.log('• Master de pruebas');
  if (
    !prisma(
      ['migrate', 'deploy', '--schema', 'prisma/master/schema.prisma'],
      base,
    )
  )
    fail('Migraciones de la master');

  const db = master();
  const admin = new PrismaClient({
    datasources: { db: { url: tenantDatabaseUrl(base, 'postgres') } },
  });
  try {
    for (const h of herbaria) {
      console.log(`\n• ${h.slug} (${h.dbName})`);
      const [{ exists }] = await admin.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${h.dbName}) AS exists`;
      if (!exists)
        await admin.$executeRawUnsafe(`CREATE DATABASE "${h.dbName}"`);

      const url = tenantDatabaseUrl(base, h.dbName);
      if (!prisma(['migrate', 'deploy'], url)) fail(`Migraciones de ${h.slug}`);
      const seed = spawnSync(
        process.execPath,
        [
          '-r',
          'ts-node/register',
          path.join(__dirname, '..', 'seed.ts'),
          '--reset',
        ],
        { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } },
      );
      if (seed.status !== 0) fail(`Seed de ${h.slug}`);

      await db.herbarium.upsert({
        where: { slug: h.slug },
        create: { ...h, status: 'ACTIVE' },
        update: {
          name: h.name,
          dbName: h.dbName,
          status: 'ACTIVE',
          suspendedAt: null,
        },
      });
    }
  } finally {
    await admin.$disconnect();
    await db.$disconnect();
  }
  console.log('\n✅ Listo: herbarios "e2e" y "e2e-b"');
});
