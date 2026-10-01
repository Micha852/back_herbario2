/**
 * Datos de la colección: valores Darwin Core que son iguales para todas las muestras
 * (institución, código de colección, derechos...). Se guardan en system_info con la
 * clave "coleccion" y los edita el admin; aquí van los valores por defecto.
 */

export const COLLECTION_SETTINGS_KEY = 'coleccion';

export interface CollectionSettings {
  /** Prefijo del occurrenceID; se le agrega el número de catálogo (p. ej. "UDLA:HUAZ:") */
  occurrenceIdPrefix: string;
  /** PreservedSpecimen (herbario) o LivingSpecimen (jardín botánico) */
  basisOfRecord: string;
  institutionCode: string;
  institutionID: string;
  collectionCode: string;
  collectionID: string;
  ownerInstitutionCode: string;
  type: string;
  language: string;
  accessRights: string;
  disposition: string;
  continent: string;
  country: string;
  countryCode: string;
  geodeticDatum: string;
  kingdom: string;
  nomenclaturalCode: string;
}

export const DEFAULT_COLLECTION_SETTINGS: CollectionSettings = {
  occurrenceIdPrefix: '',
  basisOfRecord: 'PreservedSpecimen',
  institutionCode: '',
  institutionID: '',
  collectionCode: '',
  collectionID: '',
  ownerInstitutionCode: '',
  type: 'Objeto físico',
  language: 'es',
  accessRights: 'Solo para uso no comercial',
  disposition: 'En colección',
  continent: 'SA',
  country: 'Colombia',
  countryCode: 'CO',
  geodeticDatum: 'WGS84',
  kingdom: 'Plantae',
  nomenclaturalCode: 'ICBN',
};

export const COLLECTION_SETTING_KEYS = Object.keys(
  DEFAULT_COLLECTION_SETTINGS,
) as (keyof CollectionSettings)[];

/** Combina lo guardado con los valores por defecto (ignora claves desconocidas) */
export function parseCollectionSettings(
  raw: string | null | undefined,
): CollectionSettings {
  let stored: Record<string, unknown> = {};
  try {
    stored = raw ? JSON.parse(raw) : {};
  } catch {
    stored = {};
  }
  const settings = { ...DEFAULT_COLLECTION_SETTINGS };
  for (const key of COLLECTION_SETTING_KEYS) {
    if (typeof stored[key] === 'string') settings[key] = stored[key];
  }
  return settings;
}
