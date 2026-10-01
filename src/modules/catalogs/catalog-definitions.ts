/**
 * Definición de los catálogos gestionables desde el panel.
 *
 * Un solo módulo (CatalogsService) sirve a todos: cada catálogo declara su modelo
 * de Prisma, campos editables (con validación), padre en la jerarquía y relaciones
 * que cuentan como "uso" (si hay uso, no se puede eliminar: solo inhabilitar).
 *
 * El front recibe estas definiciones (GET /catalogs) y arma formularios y tablas
 * sin repetir la configuración.
 */

export type FieldType =
  | 'string'
  | 'text'
  | 'int'
  | 'decimal'
  | 'date'
  | 'time'
  | 'stringList'
  | 'ref';

export interface CatalogField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Para type 'ref': catálogo al que apunta */
  ref?: string;
  /** Ayuda corta bajo el campo */
  hint?: string;
}

export interface CatalogUsage {
  /** Nombre de la relación en Prisma (se cuenta con _count) */
  relation: string;
  /** Texto para el usuario, en plural */
  label: string;
}

export interface CatalogDefinition {
  key: string;
  /** Delegado de Prisma (prisma[model]) */
  model: string;
  label: string;
  labelSingular: string;
  group: 'Taxonomía' | 'Morfología' | 'Ecología' | 'Ubicaciones' | 'Proyectos';
  /** Campo que se muestra como nombre del elemento */
  displayField: string;
  fields: CatalogField[];
  /** Padre en la jerarquía (la lista se puede filtrar por él) */
  parent?: { field: string; catalog: string };
  usage: CatalogUsage[];
  searchFields: string[];
  orderBy: Record<string, 'asc' | 'desc'>;
}

const NAME: CatalogField = {
  key: 'name',
  label: 'Nombre',
  type: 'string',
  required: true,
  maxLength: 100,
};
const DESCRIPTION: CatalogField = {
  key: 'description',
  label: 'Descripción',
  type: 'text',
  maxLength: 2000,
};

/** Catálogos simples: nombre + descripción, usados directamente por las muestras */
function simple(
  key: string,
  model: string,
  label: string,
  labelSingular: string,
  group: CatalogDefinition['group'],
): CatalogDefinition {
  return {
    key,
    model,
    label,
    labelSingular,
    group,
    displayField: 'name',
    fields: [NAME, DESCRIPTION],
    usage: [{ relation: 'specimens', label: 'muestras' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  };
}

export const CATALOGS: CatalogDefinition[] = [
  // ------------------------------------------------------------ Taxonomía
  {
    key: 'divisions',
    model: 'division',
    label: 'Divisiones',
    labelSingular: 'División',
    group: 'Taxonomía',
    displayField: 'name',
    fields: [NAME, DESCRIPTION],
    usage: [{ relation: 'classes', label: 'clases' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'classes',
    model: 'class',
    label: 'Clases',
    labelSingular: 'Clase',
    group: 'Taxonomía',
    displayField: 'name',
    fields: [
      {
        key: 'divisionId',
        label: 'División',
        type: 'ref',
        ref: 'divisions',
        required: true,
      },
      NAME,
      DESCRIPTION,
    ],
    parent: { field: 'divisionId', catalog: 'divisions' },
    usage: [{ relation: 'orders', label: 'órdenes' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'orders',
    model: 'order',
    label: 'Órdenes',
    labelSingular: 'Orden',
    group: 'Taxonomía',
    displayField: 'name',
    fields: [
      {
        key: 'classId',
        label: 'Clase',
        type: 'ref',
        ref: 'classes',
        required: true,
      },
      NAME,
      DESCRIPTION,
    ],
    parent: { field: 'classId', catalog: 'classes' },
    usage: [{ relation: 'families', label: 'familias' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'families',
    model: 'family',
    label: 'Familias',
    labelSingular: 'Familia',
    group: 'Taxonomía',
    displayField: 'name',
    fields: [
      {
        key: 'orderId',
        label: 'Orden',
        type: 'ref',
        ref: 'orders',
        required: true,
      },
      NAME,
      DESCRIPTION,
    ],
    parent: { field: 'orderId', catalog: 'orders' },
    usage: [{ relation: 'genera', label: 'géneros' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'genera',
    model: 'genus',
    label: 'Géneros',
    labelSingular: 'Género',
    group: 'Taxonomía',
    displayField: 'name',
    fields: [
      {
        key: 'familyId',
        label: 'Familia',
        type: 'ref',
        ref: 'families',
        required: true,
      },
      NAME,
      {
        key: 'author',
        label: 'Autor',
        type: 'string',
        maxLength: 100,
        hint: 'Ej: L., Mart.',
      },
      DESCRIPTION,
    ],
    parent: { field: 'familyId', catalog: 'families' },
    usage: [{ relation: 'species', label: 'especies' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'species',
    model: 'species',
    label: 'Especies',
    labelSingular: 'Especie',
    group: 'Taxonomía',
    displayField: 'fullName',
    fields: [
      {
        key: 'genusId',
        label: 'Género',
        type: 'ref',
        ref: 'genera',
        required: true,
      },
      {
        key: 'epithet',
        label: 'Epíteto',
        type: 'string',
        required: true,
        maxLength: 100,
        hint: 'Solo el epíteto: "precatoria" en Euterpe precatoria',
      },
      {
        key: 'author',
        label: 'Autor',
        type: 'string',
        maxLength: 150,
        hint: 'Ej: Mart., (L.) Mart.',
      },
      {
        key: 'commonNames',
        label: 'Nombres comunes',
        type: 'stringList',
        hint: 'Separados por coma',
      },
      DESCRIPTION,
    ],
    parent: { field: 'genusId', catalog: 'genera' },
    usage: [{ relation: 'specimens', label: 'muestras' }],
    searchFields: ['epithet', 'fullName'],
    orderBy: { fullName: 'asc' },
  },

  // ------------------------------------------------------------ Morfología
  simple(
    'venation-types',
    'venationType',
    'Tipos de venación',
    'Tipo de venación',
    'Morfología',
  ),
  simple(
    'form-types',
    'formType',
    'Formas de la hoja',
    'Forma de la hoja',
    'Morfología',
  ),
  simple(
    'margin-types',
    'marginType',
    'Tipos de margen',
    'Tipo de margen',
    'Morfología',
  ),

  // ------------------------------------------------------------ Ecología
  simple('origins', 'origin', 'Orígenes', 'Origen', 'Ecología'),
  simple(
    'origin-types',
    'originType',
    'Tipos de origen',
    'Tipo de origen',
    'Ecología',
  ),
  simple(
    'conditions',
    'condition',
    'Condiciones reproductivas',
    'Condición reproductiva',
    'Ecología',
  ),
  simple('habitats', 'habitat', 'Hábitats', 'Hábitat', 'Ecología'),

  // ------------------------------------------------------------ Ubicaciones
  {
    key: 'departments',
    model: 'department',
    label: 'Departamentos',
    labelSingular: 'Departamento',
    group: 'Ubicaciones',
    displayField: 'name',
    fields: [
      NAME,
      {
        key: 'code',
        label: 'Código',
        type: 'string',
        maxLength: 10,
        hint: 'Código DANE (opcional)',
      },
    ],
    usage: [{ relation: 'municipalities', label: 'municipios' }],
    searchFields: ['name', 'code'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'municipalities',
    model: 'municipality',
    label: 'Municipios',
    labelSingular: 'Municipio',
    group: 'Ubicaciones',
    displayField: 'name',
    fields: [
      {
        key: 'departmentId',
        label: 'Departamento',
        type: 'ref',
        ref: 'departments',
        required: true,
      },
      NAME,
      {
        key: 'code',
        label: 'Código',
        type: 'string',
        maxLength: 10,
        hint: 'Código DANE (opcional)',
      },
    ],
    parent: { field: 'departmentId', catalog: 'departments' },
    usage: [{ relation: 'locations', label: 'localidades' }],
    searchFields: ['name', 'code'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'location-types',
    model: 'locationType',
    label: 'Tipos de ubicación',
    labelSingular: 'Tipo de ubicación',
    group: 'Ubicaciones',
    displayField: 'name',
    fields: [NAME, DESCRIPTION],
    usage: [{ relation: 'locations', label: 'localidades' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'locations',
    model: 'location',
    label: 'Localidades',
    labelSingular: 'Localidad',
    group: 'Ubicaciones',
    displayField: 'name',
    fields: [
      {
        key: 'municipalityId',
        label: 'Municipio',
        type: 'ref',
        ref: 'municipalities',
        required: true,
      },
      {
        key: 'locationTypeId',
        label: 'Tipo de ubicación',
        type: 'ref',
        ref: 'location-types',
        required: true,
      },
      { ...NAME, maxLength: 200 },
      {
        key: 'waterBody',
        label: 'Cuerpo de agua',
        type: 'string',
        maxLength: 200,
      },
      {
        key: 'latitude',
        label: 'Latitud',
        type: 'decimal',
        min: -90,
        max: 90,
        hint: 'Grados decimales, ej: 1.6206',
      },
      {
        key: 'longitude',
        label: 'Longitud',
        type: 'decimal',
        min: -180,
        max: 180,
        hint: 'Grados decimales, ej: -75.6062',
      },
      {
        key: 'altitude',
        label: 'Altitud (m.s.n.m.)',
        type: 'int',
        min: -500,
        max: 9000,
      },
      DESCRIPTION,
    ],
    parent: { field: 'municipalityId', catalog: 'municipalities' },
    usage: [{ relation: 'specimens', label: 'muestras' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },

  // ------------------------------------------------------------ Proyectos
  {
    key: 'protocols',
    model: 'protocol',
    label: 'Protocolos de muestreo',
    labelSingular: 'Protocolo de muestreo',
    group: 'Proyectos',
    displayField: 'name',
    fields: [
      { ...NAME, maxLength: 200 },
      DESCRIPTION,
      {
        key: 'steps',
        label: 'Pasos',
        type: 'stringList',
        hint: 'Uno por línea',
      },
    ],
    usage: [{ relation: 'projects', label: 'proyectos' }],
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  },
  {
    key: 'projects',
    model: 'project',
    label: 'Proyectos',
    labelSingular: 'Proyecto',
    group: 'Proyectos',
    displayField: 'name',
    fields: [
      { ...NAME, maxLength: 200 },
      { key: 'code', label: 'Código', type: 'string', maxLength: 50 },
      {
        key: 'protocolId',
        label: 'Protocolo de muestreo',
        type: 'ref',
        ref: 'protocols',
      },
      { key: 'startDate', label: 'Fecha de inicio', type: 'date' },
      { key: 'endDate', label: 'Fecha de fin', type: 'date' },
      { key: 'startTime', label: 'Hora de inicio', type: 'time' },
      { key: 'endTime', label: 'Hora de fin', type: 'time' },
      {
        key: 'effortDays',
        label: 'Esfuerzo (días)',
        type: 'int',
        min: 0,
        max: 10000,
      },
      DESCRIPTION,
      {
        key: 'observation',
        label: 'Observaciones',
        type: 'text',
        maxLength: 2000,
      },
    ],
    usage: [{ relation: 'specimens', label: 'muestras' }],
    searchFields: ['name', 'code'],
    orderBy: { name: 'asc' },
  },
];

export function getCatalog(key: string): CatalogDefinition | undefined {
  return CATALOGS.find((catalog) => catalog.key === key);
}
