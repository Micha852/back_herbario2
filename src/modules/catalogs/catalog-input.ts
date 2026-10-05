/**
 * Validación y conversión de los datos de un catálogo (función pura, sin base de datos).
 * Recibe el cuerpo de la petición y devuelve los datos listos para Prisma,
 * o la lista de errores en español.
 */

import { Prisma } from '@prisma/client';
import { CatalogDefinition, CatalogField } from './catalog-definitions';
import { isId } from '../../common/utils/id.util';

export type CatalogInput = Record<string, unknown>;

export interface ParseResult {
  data: Record<string, unknown>;
  errors: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_LIST_ITEMS = 50;

const isBlank = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

function parseField(
  field: CatalogField,
  raw: unknown,
  errors: string[],
): unknown {
  const label = field.label;

  if (
    isBlank(raw) ||
    (Array.isArray(raw) && raw.length === 0 && field.type !== 'stringList')
  ) {
    if (field.required) errors.push(`${label} es obligatorio`);
    return field.type === 'stringList' ? [] : null;
  }

  switch (field.type) {
    case 'string':
    case 'text': {
      if (typeof raw !== 'string') {
        errors.push(`${label} debe ser texto`);
        return undefined;
      }
      const value = raw.trim();
      if (field.maxLength && value.length > field.maxLength) {
        errors.push(`${label} no puede superar ${field.maxLength} caracteres`);
      }
      return value;
    }

    case 'int':
    case 'decimal': {
      const value =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string'
            ? Number(raw.replace(',', '.'))
            : NaN;
      if (!Number.isFinite(value)) {
        errors.push(`${label} debe ser un número`);
        return undefined;
      }
      if (field.type === 'int' && !Number.isInteger(value)) {
        errors.push(`${label} debe ser un número entero`);
        return undefined;
      }
      if (field.min !== undefined && value < field.min)
        errors.push(`${label} debe ser mayor o igual a ${field.min}`);
      if (field.max !== undefined && value > field.max)
        errors.push(`${label} debe ser menor o igual a ${field.max}`);
      return field.type === 'decimal' ? new Prisma.Decimal(value) : value;
    }

    case 'date': {
      if (
        typeof raw !== 'string' ||
        !DATE_RE.test(raw) ||
        Number.isNaN(Date.parse(`${raw}T00:00:00Z`))
      ) {
        errors.push(`${label} debe ser una fecha válida (AAAA-MM-DD)`);
        return undefined;
      }
      return new Date(`${raw}T00:00:00.000Z`);
    }

    case 'time': {
      if (typeof raw !== 'string' || !TIME_RE.test(raw.trim())) {
        errors.push(`${label} debe tener el formato HH:MM`);
        return undefined;
      }
      return raw.trim();
    }

    case 'stringList': {
      const items = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
          ? raw.split(/[\n,]/)
          : null;
      if (!items || items.some((item) => typeof item !== 'string')) {
        errors.push(`${label} debe ser una lista de textos`);
        return undefined;
      }
      const values = [
        ...new Set(
          (items as string[]).map((item) => item.trim()).filter(Boolean),
        ),
      ];
      if (values.length > MAX_LIST_ITEMS)
        errors.push(`${label} admite máximo ${MAX_LIST_ITEMS} elementos`);
      if (field.required && values.length === 0)
        errors.push(`${label} es obligatorio`);
      return values;
    }

    case 'ref': {
      if (typeof raw !== 'string' || !isId(raw)) {
        errors.push(`${label} no es válido`);
        return undefined;
      }
      return raw;
    }
  }
}

/**
 * create: valida todos los campos (obligatorios incluidos).
 * update: valida solo los campos enviados; los vacíos se limpian (null).
 * `isActive` no se acepta aquí: se cambia con su propio permiso (catalogs.delete).
 */
export function parseCatalogInput(
  definition: CatalogDefinition,
  input: CatalogInput,
  mode: 'create' | 'update',
): ParseResult {
  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { data, errors: ['Datos inválidos'] };
  }

  const known = new Set(definition.fields.map((field) => field.key));
  const unknown = Object.keys(input).filter(
    (key) => !known.has(key) && key !== 'isActive',
  );
  if (unknown.length)
    errors.push(`Campos no permitidos: ${unknown.join(', ')}`);

  for (const field of definition.fields) {
    const present = Object.prototype.hasOwnProperty.call(input, field.key);
    if (mode === 'update' && !present) continue;
    const value = parseField(field, input[field.key], errors);
    if (value !== undefined) data[field.key] = value;
  }

  if ('isActive' in input && typeof input.isActive !== 'boolean') {
    errors.push('isActive debe ser verdadero o falso');
  }

  return { data, errors };
}

/** Nombre de la relación de Prisma a partir del campo FK (divisionId → division) */
export function relationOf(fieldKey: string): string {
  return fieldKey.replace(/Id$/, '');
}

/** Nombre completo de una especie: "Género epíteto autor" */
export function speciesFullName(
  genusName: string,
  epithet: string,
  author?: string | null,
): string {
  return [genusName, epithet, author]
    .filter((part) => part && part.trim())
    .join(' ');
}
