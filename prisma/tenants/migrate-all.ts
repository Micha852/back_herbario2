/**
 * Aplica las migraciones pendientes (prisma migrate deploy) en la base de CADA herbario.
 * Se corre en cada despliegue, después de las migraciones de la master.
 *
 *   npm run tenants:migrate              todos (activos y suspendidos)
 *   npm run tenants:migrate -- --slug huaz
 *
 * Sigue con los demás si uno falla y termina con error si alguno falló.
 */

import {
  arg,
  baseDatabaseUrl,
  master,
  prisma,
  run,
  tenantDatabaseUrl,
} from './lib';

run(async () => {
  const only = arg('slug');
  const db = master();
  const herbaria = await db.herbarium.findMany({
    where: {
      status: { in: ['ACTIVE', 'SUSPENDED'] },
      ...(only && { slug: only }),
    },
    orderBy: { createdAt: 'asc' },
  });
  await db.$disconnect();

  if (herbaria.length === 0) {
    console.log(
      only ? `No hay un herbario "${only}"` : 'No hay herbarios todavía',
    );
    return;
  }

  const base = baseDatabaseUrl();
  const failed: string[] = [];
  for (const h of herbaria) {
    console.log(`\n── ${h.slug} (${h.dbName})`);
    if (!prisma(['migrate', 'deploy'], tenantDatabaseUrl(base, h.dbName))) {
      failed.push(h.slug);
    }
  }

  console.log(
    `\n${herbaria.length - failed.length}/${herbaria.length} herbario(s) al día`,
  );
  if (failed.length) throw new Error(`Fallaron: ${failed.join(', ')}`);
});
