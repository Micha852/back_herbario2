/**
 * Entorno de los tests e2e (jest-e2e.json → setupFiles), antes de cargar la app:
 * - El herbario por defecto es "e2e" (el .env de desarrollo apunta a otro).
 * - La master de pruebas: si MASTER_DATABASE_URL no es de pruebas, se usa
 *   herbario_master_e2e en el mismo servidor que DATABASE_URL.
 * Lo que se pone aquí gana sobre el .env (ConfigModule no pisa variables ya definidas).
 * Preparar las bases: npm run tenants:setup-test (ver prisma/tenants/setup-test.ts).
 */

const SAFE = /test|e2e|ci/i;
const dbName = (url?: string) => (url ? new URL(url).pathname.slice(1) : '');

process.env.DEFAULT_HERBARIUM = process.env.E2E_HERBARIUM ?? 'e2e';

if (
  process.env.DATABASE_URL &&
  !SAFE.test(dbName(process.env.MASTER_DATABASE_URL))
) {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/herbario_master_e2e';
  process.env.MASTER_DATABASE_URL = url.toString();
}
