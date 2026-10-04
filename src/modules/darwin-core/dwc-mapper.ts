/**
 * Muestra (con sus relaciones) → registro Darwin Core. Funciones puras.
 */

import { Prisma } from '@prisma/client';
import { publicUserSelect } from '../../common/prisma/user-select';
import { resolveTaxonomy, taxonomyInclude } from '../../common/prisma/taxonomy';
import { CollectionSettings } from './dwc-collection';
import { DWC_TERMS, DwcRecord } from './dwc-terms';

/** Relaciones que necesita el mapeo */
export const dwcSpecimenInclude = {
  ...taxonomyInclude,
  location: {
    include: { municipality: { include: { department: true } } },
  },
  origin: true,
  originType: true,
  condition: true,
  habitat: true,
  project: { include: { protocol: true } },
  collectors: {
    include: { user: { select: publicUserSelect } },
    orderBy: [{ isPrincipal: 'desc' }, { assignedAt: 'asc' }],
  },
} satisfies Prisma.SpecimenInclude;

export type DwcSpecimen = Prisma.SpecimenGetPayload<{
  include: typeof dwcSpecimenInclude;
}>;

/** Separador de listas en Darwin Core (recordedBy, establishmentMeans...) */
export const DWC_LIST_SEPARATOR = ' | ';

const text = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const num = (value: Prisma.Decimal | number | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** "30 adultos 6 juveniles", "Adulto", "Juvenil" (como en la plantilla) */
export function lifeStageOf(
  adults: number | null | undefined,
  juveniles: number | null | undefined,
): string | null {
  const a = adults ?? 0;
  const j = juveniles ?? 0;
  if (a > 0 && j > 0)
    return `${a} ${a === 1 ? 'adulto' : 'adultos'} ${j} ${j === 1 ? 'juvenil' : 'juveniles'}`;
  if (a > 0) return 'Adulto';
  if (j > 0) return 'Juvenil';
  return null;
}

/** Recolectores usuarios + recolectores en texto, sin repetir */
export function recordedByOf(specimen: {
  collectors: { user: { name: string } }[];
  otherCollectors?: string | null;
}): string | null {
  const names = [
    ...specimen.collectors.map((c) => c.user.name.trim()),
    ...(specimen.otherCollectors ?? '').split('|').map((n) => n.trim()),
  ].filter(Boolean);
  const unique = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()];
  return unique.length ? unique.join(DWC_LIST_SEPARATOR) : null;
}

export function specimenToDwc(
  specimen: DwcSpecimen,
  settings: CollectionSettings,
): DwcRecord {
  const {
    species,
    genus,
    family,
    order,
    class: taxonClass,
    division,
    rank: taxonRank,
  } = resolveTaxonomy(specimen);
  const location = specimen.location;
  const municipality = location?.municipality;
  const project = specimen.project;

  const date = specimen.collectionDate;
  const year = date ? date.getUTCFullYear() : specimen.collectionYear;

  const projectRange =
    project?.startDate && project?.endDate
      ? `${isoDate(project.startDate)}/${isoDate(project.endDate)}`
      : null;

  const minElevation = specimen.minElevation ?? specimen.altitude;
  const maxElevation = specimen.maxElevation ?? specimen.altitude;
  const verbatimElevation =
    minElevation != null &&
    maxElevation != null &&
    minElevation !== maxElevation
      ? `${minElevation}-${maxElevation} m`
      : (minElevation ?? maxElevation) != null
        ? `${minElevation ?? maxElevation} m`
        : null;

  const individuals =
    specimen.adultsCount != null || specimen.juvenilesCount != null
      ? (specimen.adultsCount ?? 0) + (specimen.juvenilesCount ?? 0)
      : null;

  const establishment = [specimen.origin?.name, specimen.originType?.name]
    .map(text)
    .filter(Boolean)
    .join(DWC_LIST_SEPARATOR);

  // Par completo: el de la muestra, o si no tiene, el de la localidad (nunca mezclados)
  const point: [number, number] | null =
    specimen.latitude != null && specimen.longitude != null
      ? [num(specimen.latitude)!, num(specimen.longitude)!]
      : location?.latitude != null && location?.longitude != null
        ? [num(location.latitude)!, num(location.longitude)!]
        : null;

  const record: Partial<DwcRecord> = {
    occurrenceID: `${settings.occurrenceIdPrefix}${specimen.catalogNumber}`,
    basisOfRecord: text(settings.basisOfRecord),
    institutionCode: text(settings.institutionCode),
    collectionCode: text(settings.collectionCode),
    catalogNumber: specimen.catalogNumber,
    type: text(settings.type),
    language: text(settings.language),
    accessRights: text(settings.accessRights),
    institutionID: text(settings.institutionID),
    collectionID: text(settings.collectionID),
    ownerInstitutionCode: text(settings.ownerInstitutionCode),

    occurrenceRemarks: text(specimen.localObservation),
    recordNumber: text(specimen.registryNumber),
    recordedBy: recordedByOf(specimen),
    individualCount: individuals,
    lifeStage: lifeStageOf(specimen.adultsCount, specimen.juvenilesCount),
    reproductiveCondition: text(specimen.condition?.name),
    establishmentMeans: establishment || null,
    disposition: text(settings.disposition),

    samplingProtocol: text(project?.protocol?.name),
    samplingEffort:
      project?.effortDays != null
        ? `${project.effortDays} ${project.effortDays === 1 ? 'día' : 'días'} de colecta`
        : null,
    eventDate: date ? isoDate(date) : projectRange,
    eventTime:
      project?.startTime && project?.endTime
        ? `${project.startTime}/${project.endTime}`
        : text(project?.startTime),
    year: year ?? null,
    month: date ? date.getUTCMonth() + 1 : null,
    day: date ? date.getUTCDate() : null,
    habitat: text(specimen.habitat?.name),
    fieldNotes: text(specimen.fieldNotes),
    eventRemarks: text(project?.observation),

    locationID: municipality?.code
      ? `${settings.countryCode}:${municipality.code}`
      : null,
    continent: text(settings.continent),
    waterBody: text(location?.waterBody),
    country: text(settings.country),
    countryCode: text(settings.countryCode),
    stateProvince: text(municipality?.department?.name),
    county: text(municipality?.name),
    locality: text(location?.name),
    verbatimElevation,
    minimumElevationInMeters: minElevation ?? null,
    maximumElevationInMeters: maxElevation ?? null,
    locationRemarks: text(location?.description),
    decimalLatitude: point?.[0] ?? null,
    decimalLongitude: point?.[1] ?? null,

    identifiedBy: text(specimen.identifiedBy),
    dateIdentified: text(specimen.dateIdentified),

    scientificName: text(specimen.scientificName),
    kingdom: text(settings.kingdom),
    phylum: text(division?.name),
    class: text(taxonClass?.name),
    order: text(order?.name),
    family: text(family?.name),
    genus: text(genus?.name),
    specificEpithet: text(species?.epithet),
    taxonRank,
    verbatimTaxonRank: taxonRank === 'Género' ? 'sp.' : null,
    scientificNameAuthorship: text(specimen.author) ?? text(species?.author),
    vernacularName: text(specimen.commonName),
    nomenclaturalCode: text(settings.nomenclaturalCode),
    taxonRemarks: text(specimen.identificationNotes),
  };

  // Con coordenadas se informa el datum
  if (record.decimalLatitude != null && record.decimalLongitude != null) {
    record.geodeticDatum = text(settings.geodeticDatum);
  }

  // Todas las columnas, en orden (vacías = null)
  return Object.fromEntries(
    DWC_TERMS.map((term) => [term, record[term] ?? null]),
  ) as DwcRecord;
}
