/**
 * Plantilla neutra de un herbario NUEVO: la migración inicial trae las páginas del CMS
 * (Historia, Datos, Contacto, Términos) con el texto de la Universidad de la Amazonía y un
 * contador "HUAZ". Al crear un herbario se reemplazan por textos genéricos con su nombre;
 * cada herbario los ajusta después desde su CMS.
 * Plantilla: prisma/templates/herbarium-content.json (la usa también el comando
 * herbarium:create, en prisma/tenants/lib.ts).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

type PageTemplate = { title: string; content: unknown };

const templatePath = () =>
  join(process.cwd(), 'prisma', 'templates', 'herbarium-content.json');

/** Reemplaza {{variables}} en cada texto del objeto (no en el JSON crudo: un valor no lo rompe) */
export function fillTemplate<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      key in vars ? vars[key] : match,
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillTemplate(item, vars)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillTemplate(v, vars)]),
    ) as T;
  }
  return value;
}

/** Páginas del CMS de un herbario nuevo, con su nombre y su correo de contacto */
export function defaultContent(name: string, contactEmail?: string | null) {
  const month = new Date().toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
  const template = JSON.parse(readFileSync(templatePath(), 'utf8')) as Record<
    string,
    PageTemplate
  >;
  return fillTemplate(template, {
    nombre: name,
    correo: contactEmail ?? '',
    fecha: month.charAt(0).toUpperCase() + month.slice(1),
  });
}

export async function applyDefaultContent(
  db: PrismaClient,
  name: string,
  contactEmail?: string | null,
) {
  for (const [key, page] of Object.entries(
    defaultContent(name, contactEmail),
  )) {
    const data = {
      title: page.title,
      content: JSON.stringify(page.content, null, 2),
      isActive: true,
    };
    await db.systemInfo.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });
  }
  // Contador de la migración inicial (sin usar): cada herbario numera con su identificador
  await db.catalogCounter.deleteMany({
    where: { prefix: 'HUAZ', lastNumber: 0 },
  });
}
