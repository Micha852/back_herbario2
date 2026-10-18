/**
 * Reglas del identificador (slug) de un herbario: es su subdominio, <slug>.<PLATFORM_DOMAIN>.
 * Las mismas reglas están en prisma/tenants/lib.ts (los scripts no pueden importar src/:
 * la imagen de Docker no lo incluye).
 */

/** Etiqueta DNS: minúsculas, números y guiones; sin guion al inicio ni al final; 2-40 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$/;

/** Subdominios que no pueden ser herbarios (de la plataforma o confusos) */
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

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

/**
 * Slug a partir del Host de la petición: "huaz.herbaria.co:443" → "huaz".
 * undefined si el host no es un subdominio de la plataforma (o es www / el dominio raíz).
 */
export function slugFromHost(
  host: string | undefined,
  platformDomain: string | undefined,
): string | undefined {
  if (!host || !platformDomain) return undefined;
  const hostname = host.split(':')[0].trim().toLowerCase().replace(/\.$/, '');
  const domain = platformDomain.trim().toLowerCase().replace(/^\./, '');
  if (!hostname.endsWith(`.${domain}`)) return undefined;
  const sub = hostname.slice(0, -(domain.length + 1));
  // Solo un nivel: a.b.dominio no es un herbario
  if (!sub || sub.includes('.') || sub === 'www') return undefined;
  return sub;
}
