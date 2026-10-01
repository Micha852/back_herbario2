/**
 * Interpretación de una fila Darwin Core → datos de muestra (sin tocar la base).
 * Errores = la fila no se puede importar; avisos = se importa con algún ajuste.
 */

import { RawRow, RawValue } from './dwc-read';

export interface ImportRow {
  line: number;
  catalogNumber: string;
  scientificName: string;
  author: string | null;
  commonName: string | null;
  registryNumber: string | null;

  taxonomy: {
    division: string | null;
    class: string | null;
    order: string | null;
    family: string | null;
    genus: string | null;
    epithet: string | null;
  };

  location: {
    department: string | null;
    municipality: string | null;
    /** Código DANE del municipio (de locationID "CO:18001") */
    municipalityCode: string | null;
    locality: string | null;
    waterBody: string | null;
    remarks: string | null;
  };

  latitude: number | null;
  longitude: number | null;
  minElevation: number | null;
  maxElevation: number | null;

  collectionDate: Date | null;
  collectionYear: number | null;

  adultsCount: number | null;
  juvenilesCount: number | null;

  condition: string | null;
  /** Partes de establishmentMeans ("Nativo | Cultivado") */
  establishment: string[];
  habitat: string | null;

  recordedBy: string[];
  identifiedBy: string | null;
  dateIdentified: string | null;

  localObservation: string | null;
  fieldNotes: string | null;
  identificationNotes: string | null;

  errors: string[];
  warnings: string[];
}

const DATE_IDENTIFIED = /^\d{4}(-\d{2}(-\d{2})?)?(\/\d{4}(-\d{2}(-\d{2})?)?)?$/;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function str(value: RawValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isoDate(value);
  const text = String(value).trim();
  return text ? text : null;
}

export function num(value: RawValue | undefined): number | null {
  if (value === null || value === undefined || value instanceof Date)
    return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).trim().replace(',', '.'));
  return String(value).trim() && Number.isFinite(parsed) ? parsed : null;
}

const int = (value: RawValue | undefined) => {
  const n = num(value);
  return n === null ? null : Math.round(n);
};

/** "Nativo | Cultivado" → ["Nativo", "Cultivado"] */
export function splitList(value: RawValue | undefined): string[] {
  return (str(value) ?? '')
    .split(/\s*[|;]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** "240-280 m" → [240, 280]; "300 m" → [300, 300] */
export function parseElevation(
  value: RawValue | undefined,
): [number | null, number | null] {
  const numbers = (str(value) ?? '')
    // El "-" es signo solo si no va pegado a otro número ("240-280" es un rango)
    .match(/(?<!\d)-?\d+(?:[.,]\d+)?/g)
    ?.map((n) => Math.round(Number(n.replace(',', '.'))));
  if (!numbers?.length) return [null, null];
  return [numbers[0], numbers[1] ?? numbers[0]];
}

/** Etapa de vida + individualCount → adultos / juveniles */
export function parseLifeStage(
  lifeStage: string | null,
  individualCount: number | null,
): { adults: number | null; juveniles: number | null; warning?: string } {
  const text = (lifeStage ?? '').toLowerCase();
  const adults = text.match(/(\d+)\s*adult/)?.[1];
  const juveniles = text.match(/(\d+)\s*juvenil/)?.[1];

  if (adults || juveniles) {
    const a = adults ? Number(adults) : 0;
    const j = juveniles ? Number(juveniles) : 0;
    const warning =
      individualCount !== null && individualCount !== a + j
        ? `individualCount (${individualCount}) no coincide con la etapa de vida (${a + j})`
        : undefined;
    return { adults: a, juveniles: j, warning };
  }
  if (text.includes('juvenil'))
    return { adults: null, juveniles: individualCount ?? null };
  if (text.includes('adult'))
    return { adults: individualCount ?? null, juveniles: null };
  if (individualCount !== null) {
    return {
      adults: individualCount,
      juveniles: null,
      warning: lifeStage
        ? `Etapa de vida "${lifeStage}" no reconocida: los ${individualCount} individuos se registraron como adultos`
        : `Sin etapa de vida: los ${individualCount} individuos se registraron como adultos`,
    };
  }
  return { adults: null, juveniles: null };
}

function parseCollectionDate(values: RawRow, warnings: string[]) {
  const year = int(values.year);
  const month = int(values.month);
  const day = int(values.day);

  if (year && month && day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return { date, year };
    }
    warnings.push(
      `Fecha ${year}-${month}-${day} no válida: se guardó solo el año`,
    );
    return { date: null, year };
  }

  const eventDate = values.eventDate;
  if (eventDate instanceof Date)
    return { date: eventDate, year: eventDate.getUTCFullYear() };
  const text = str(eventDate);
  if (text && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime()))
      return { date, year: date.getUTCFullYear() };
  }
  const yearFromText = text?.match(/^(\d{4})/)?.[1];
  const fallbackYear = year ?? (yearFromText ? Number(yearFromText) : null);
  if (text && fallbackYear) {
    warnings.push(
      `Fecha de colecta "${text}" sin día exacto: se guardó solo el año`,
    );
  }
  return { date: null, year: fallbackYear };
}

export function interpretRow(line: number, values: RawRow): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const catalogNumber = str(values.catalogNumber);
  const scientificName = str(values.scientificName);
  if (!catalogNumber) errors.push('Falta catalogNumber');
  else if (catalogNumber.length > 50)
    errors.push('catalogNumber supera 50 caracteres');
  if (!scientificName) errors.push('Falta scientificName');
  else if (scientificName.length > 200)
    errors.push('scientificName supera 200 caracteres');

  // Taxonomía
  const genus = str(values.genus);
  let epithet = str(values.specificEpithet);
  if (!epithet && genus && scientificName?.startsWith(`${genus} `)) {
    const second = scientificName.split(/\s+/)[1];
    if (second && /^[a-zà-ÿ-]+$/.test(second)) epithet = second;
  }

  // Coordenadas
  let latitude = num(values.decimalLatitude);
  let longitude = num(values.decimalLongitude);
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    warnings.push(`Latitud ${latitude} fuera de rango: se omitió`);
    latitude = null;
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    warnings.push(`Longitud ${longitude} fuera de rango: se omitió`);
    longitude = null;
  }
  if ((latitude === null) !== (longitude === null)) {
    warnings.push('Coordenadas incompletas: se omitieron');
    latitude = null;
    longitude = null;
  }

  // Elevación
  let minElevation = int(values.minimumElevationInMeters);
  let maxElevation = int(values.maximumElevationInMeters);
  if (minElevation === null && maxElevation === null) {
    [minElevation, maxElevation] = parseElevation(values.verbatimElevation);
  }
  if (
    minElevation !== null &&
    maxElevation !== null &&
    minElevation > maxElevation
  ) {
    [minElevation, maxElevation] = [maxElevation, minElevation];
    warnings.push('Elevación mínima mayor que la máxima: se intercambiaron');
  }

  // Individuos
  const individualCount = int(values.individualCount);
  const life = parseLifeStage(str(values.lifeStage), individualCount);
  if (life.warning) warnings.push(life.warning);

  // Fechas
  const collection = parseCollectionDate(values, warnings);
  let dateIdentified = str(values.dateIdentified);
  if (dateIdentified && !DATE_IDENTIFIED.test(dateIdentified)) {
    warnings.push(
      `dateIdentified "${dateIdentified}" no tiene formato AAAA[-MM[-DD]]: se omitió`,
    );
    dateIdentified = null;
  }

  // Notas de identificación (+ epíteto infraespecífico, que no tiene campo propio)
  const infraspecific = str(values.infraspecificEpithet);
  const identificationNotes =
    [
      str(values.taxonRemarks),
      infraspecific && `Epíteto infraespecífico: ${infraspecific}`,
    ]
      .filter(Boolean)
      .join('. ') || null;

  const locationCode = str(values.locationID)?.match(/(\d{5})$/)?.[1] ?? null;

  return {
    line,
    catalogNumber: catalogNumber ?? '',
    scientificName: scientificName ?? '',
    author: str(values.scientificNameAuthorship)?.slice(0, 200) ?? null,
    commonName: str(values.vernacularName)?.slice(0, 200) ?? null,
    registryNumber: str(values.recordNumber)?.slice(0, 50) ?? null,
    taxonomy: {
      division: str(values.phylum),
      class: str(values.class),
      order: str(values.order),
      family: str(values.family),
      genus,
      epithet,
    },
    location: {
      department: str(values.stateProvince),
      municipality: str(values.county),
      municipalityCode: locationCode,
      locality: str(values.locality),
      waterBody: str(values.waterBody),
      remarks: str(values.locationRemarks),
    },
    latitude,
    longitude,
    minElevation,
    maxElevation,
    collectionDate: collection.date,
    collectionYear: collection.year,
    adultsCount: life.adults,
    juvenilesCount: life.juveniles,
    condition: str(values.reproductiveCondition),
    establishment: splitList(values.establishmentMeans),
    habitat: str(values.habitat),
    recordedBy: splitList(values.recordedBy),
    identifiedBy: str(values.identifiedBy)?.slice(0, 200) ?? null,
    dateIdentified,
    localObservation: str(values.occurrenceRemarks),
    fieldNotes: str(values.fieldNotes),
    identificationNotes,
    errors,
    warnings,
  };
}
