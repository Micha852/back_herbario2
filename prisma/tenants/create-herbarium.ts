/**
 * Da de alta un herbario en la plataforma.
 *
 *   npm run herbarium:create -- --slug coah --name "Herbario COAH"
 *       [--email contacto@...]        correo de contacto del herbario
 *       [--db nombre_base]            nombre de la base (por defecto herbario_<slug>)
 *       [--existing]                  la base ya existe (adoptar una instalación, p. ej. HUAZ)
 *       [--admin-email a@b.co --admin-name "Nombre"]   crea su primer administrador
 *                                     (pide la contraseña, o ADMIN_PASSWORD sin terminal)
 *
 * Pasos: registro en la master (PROVISIONING) → base nueva → migraciones (incluyen roles y
 * catálogos iniciales) → admin → ACTIVE. Si algo falla con una base nueva, se borra la base y
 * el registro: no quedan herbarios a medias.
 */

import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'child_process';
import * as path from 'path';
import {
  applyDefaultContent,
  arg,
  baseDatabaseUrl,
  DB_NAME_PATTERN,
  defaultDbName,
  fail,
  flag,
  isValidSlug,
  master,
  prisma,
  run,
  tenantDatabaseUrl,
} from './lib';

run(async () => {
  const slug = (arg('slug') ?? '').toLowerCase();
  const name = arg('name') ?? '';
  const existing = flag('existing');
  const dbName = arg('db') ?? defaultDbName(slug);
  const adminEmail = arg('admin-email');

  if (!isValidSlug(slug))
    fail(
      'Slug inválido (--slug): minúsculas, números y guiones, 2-40, sin www/api/admin…',
    );
  if (name.length < 3) fail('Falta el nombre (--name "Herbario …")');
  if (!DB_NAME_PATTERN.test(dbName))
    fail('Nombre de base inválido (--db): minúsculas, números y _');

  const base = baseDatabaseUrl();
  const tenantUrl = tenantDatabaseUrl(base, dbName);
  const db = master();
  let createdDb = false;
  let createdRow: string | null = null;

  try {
    if (await db.herbarium.findUnique({ where: { slug } }))
      fail(`Ya existe un herbario con el slug "${slug}"`);
    if (await db.herbarium.findUnique({ where: { dbName } }))
      fail(`La base "${dbName}" ya es de otro herbario`);

    const row = await db.herbarium.create({
      data: { slug, name, dbName, contactEmail: arg('email') },
    });
    createdRow = row.id;
    console.log(`• Registrado "${name}" (${slug}) → base ${dbName}`);

    // CREATE DATABASE desde la base de mantenimiento del mismo servidor
    const admin = new PrismaClient({
      datasources: { db: { url: tenantDatabaseUrl(base, 'postgres') } },
    });
    try {
      const [{ exists }] = await admin.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${dbName}) AS exists`;
      if (existing && !exists)
        fail(`--existing: la base "${dbName}" no existe`);
      if (!existing && exists)
        fail(`La base "${dbName}" ya existe: usa --existing para adoptarla`);
      if (!existing) {
        // dbName validado arriba (solo [a-z0-9_]): seguro dentro de comillas
        await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
        createdDb = true;
        console.log(`• Base ${dbName} creada`);
      }
    } finally {
      await admin.$disconnect();
    }

    console.log('• Migraciones…');
    if (!prisma(['migrate', 'deploy'], tenantUrl))
      fail('Las migraciones fallaron (ver arriba)');

    // Base nueva: plantilla neutra del CMS con su nombre (una adoptada conserva su contenido)
    if (!existing) {
      await applyDefaultContent(tenantUrl, name, arg('email'));
      console.log('• Plantilla neutra del sitio aplicada');
    }

    if (adminEmail) {
      console.log('• Primer administrador…');
      const script = path.join(__dirname, '..', 'create-admin.ts');
      const result = spawnSync(
        process.execPath,
        [
          '-r',
          'ts-node/register',
          script,
          '--email',
          adminEmail,
          '--name',
          arg('admin-name') ?? '',
        ],
        { stdio: 'inherit', env: { ...process.env, DATABASE_URL: tenantUrl } },
      );
      if (result.status !== 0) fail('No se pudo crear el administrador');
    }

    await db.herbarium.update({
      where: { id: row.id },
      data: { status: 'ACTIVE' },
    });
    createdRow = null;
    console.log(`\n✅ Herbario "${name}" listo: ${slug}.<PLATFORM_DOMAIN>`);
    if (!adminEmail)
      console.log(
        `   Sin administrador: créalo con DATABASE_URL de la base ${dbName} y npm run create-admin`,
      );
  } catch (error) {
    // Deshacer: no dejar herbarios a medias
    if (createdRow) {
      await db.herbarium
        .delete({ where: { id: createdRow } })
        .catch(() => undefined);
    }
    if (createdDb) {
      const admin = new PrismaClient({
        datasources: { db: { url: tenantDatabaseUrl(base, 'postgres') } },
      });
      await admin
        .$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
        .catch(() => undefined);
      await admin.$disconnect();
      console.error(`• Se deshizo: base ${dbName} borrada`);
    }
    throw error;
  } finally {
    await db.$disconnect();
  }
});
