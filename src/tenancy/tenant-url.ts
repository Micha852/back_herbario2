/**
 * URL de conexión de la base de un herbario: la de DATABASE_URL (servidor, usuario,
 * contraseña) con el nombre de base del herbario. Así no se guardan credenciales por
 * herbario en la base master. Copia en prisma/tenants/lib.ts (los scripts no importan src/).
 */
export function tenantDatabaseUrl(
  baseUrl: string,
  dbName: string,
  connectionLimit?: number,
): string {
  const url = new URL(baseUrl);
  url.pathname = `/${dbName}`;
  if (connectionLimit) {
    url.searchParams.set('connection_limit', String(connectionLimit));
  }
  return url.toString();
}
