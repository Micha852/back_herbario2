/**
 * Taxonomía de una muestra: se liga al nivel más bajo identificado
 * (especie, o solo género, o solo familia). Aquí están el include para traer
 * la jerarquía completa desde cualquiera de los tres, los filtros y las reglas.
 */

import { Prisma } from '@prisma/client';

const classChain = { include: { division: true } } as const;
const orderChain = { include: { class: classChain } } as const;
const familyChain = { include: { order: orderChain } } as const;
const genusChain = { include: { family: familyChain } } as const;

/** Include con la jerarquía completa desde especie, género o familia */
export const taxonomyInclude = {
  species: { include: { genus: genusChain } },
  genus: genusChain,
  family: familyChain,
} satisfies Prisma.SpecimenInclude;

type TaxonNode = { id: string; name: string } | null | undefined;

interface WithTaxonomy {
  species?: {
    id: string;
    epithet: string;
    author?: string | null;
    genus?: GenusNode | null;
  } | null;
  genus?: GenusNode | null;
  family?: FamilyNode | null;
}
interface FamilyNode {
  id: string;
  name: string;
  order?: {
    id: string;
    name: string;
    class?: { id: string; name: string; division?: TaxonNode } | null;
  } | null;
}
interface GenusNode {
  id: string;
  name: string;
  author?: string | null;
  family?: FamilyNode | null;
}

/** Jerarquía resuelta desde el nivel más bajo que tenga la muestra */
export function resolveTaxonomy(specimen: WithTaxonomy) {
  const species = specimen.species ?? null;
  const genus = species?.genus ?? specimen.genus ?? null;
  const family = genus?.family ?? specimen.family ?? null;
  const order = family?.order ?? null;
  const taxonClass = order?.class ?? null;
  const division = taxonClass?.division ?? null;
  const rank = species
    ? 'Especie'
    : genus
      ? 'Género'
      : family
        ? 'Familia'
        : null;
  return { division, class: taxonClass, order, family, genus, species, rank };
}

/**
 * Filtro por un nivel de la jerarquía: incluye las muestras ligadas a ese nivel
 * o a cualquier nivel inferior.
 */
export function taxonomyWhere(
  level: 'species' | 'genus' | 'family' | 'order' | 'class' | 'division',
  id: string,
): Prisma.SpecimenWhereInput {
  switch (level) {
    case 'species':
      return { speciesId: id };
    case 'genus':
      return { OR: [{ genusId: id }, { species: { genusId: id } }] };
    case 'family':
      return {
        OR: [
          { familyId: id },
          { genus: { familyId: id } },
          { species: { genus: { familyId: id } } },
        ],
      };
    case 'order':
      return {
        OR: [
          { family: { orderId: id } },
          { genus: { family: { orderId: id } } },
          { species: { genus: { family: { orderId: id } } } },
        ],
      };
    case 'class':
      return {
        OR: [
          { family: { order: { classId: id } } },
          { genus: { family: { order: { classId: id } } } },
          { species: { genus: { family: { order: { classId: id } } } } },
        ],
      };
    case 'division':
      return {
        OR: [
          { family: { order: { class: { divisionId: id } } } },
          { genus: { family: { order: { class: { divisionId: id } } } } },
          {
            species: {
              genus: { family: { order: { class: { divisionId: id } } } },
            },
          },
        ],
      };
  }
}

/** Búsqueda de texto en la taxonomía (epíteto, género y familia en cualquier nivel) */
export function taxonomySearch(
  contains: Prisma.StringFilter,
): Prisma.SpecimenWhereInput[] {
  return [
    { species: { epithet: contains } },
    { species: { genus: { name: contains } } },
    { species: { genus: { family: { name: contains } } } },
    { genus: { name: contains } },
    { genus: { family: { name: contains } } },
    { family: { name: contains } },
  ];
}

/**
 * Deja ligado solo el nivel más bajo enviado (especie > género > familia).
 * En una edición parcial, si se envía un nivel, los inferiores no enviados se limpian.
 */
export function normalizeTaxonLevel<
  T extends {
    speciesId?: string | null;
    genusId?: string | null;
    familyId?: string | null;
  },
>(data: T): T {
  if (data.speciesId) return { ...data, genusId: null, familyId: null };
  if (data.genusId)
    return { ...data, familyId: null, speciesId: data.speciesId ?? null };
  if (data.familyId)
    return {
      ...data,
      speciesId: data.speciesId ?? null,
      genusId: data.genusId ?? null,
    };
  return data;
}
