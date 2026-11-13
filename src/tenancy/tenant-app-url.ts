import { TenantContext } from './tenant-context';

/** En APP_URL se cambia por el identificador del herbario */
export const APP_URL_PLACEHOLDER = '{herbario}';

/** Desarrollo: cada herbario en <slug>.localhost:3000 */
export const DEV_APP_URL = `http://${APP_URL_PLACEHOLDER}.localhost:3000`;

/**
 * URL pública del front del herbario actual (enlace en las fichas PDF, regreso de Chairá).
 * APP_URL lleva {herbario}: "https://{herbario}.herbariodigital.co" → "https://huaz.herbariodigital.co".
 * Sin {herbario} se usa tal cual (todos en un mismo dominio). Con {herbario} pero sin
 * herbario en curso no hay URL (null).
 */
export function tenantAppUrl(
  appUrl: string,
  slug: string | undefined = TenantContext.current()?.slug,
): string | null {
  const base = appUrl.trim().replace(/\/+$/, '');
  if (!base.includes(APP_URL_PLACEHOLDER)) return base;
  return slug ? base.split(APP_URL_PLACEHOLDER).join(slug) : null;
}

/** "huaz, Coah ,," → {"huaz", "coah"} */
export function slugList(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  );
}
