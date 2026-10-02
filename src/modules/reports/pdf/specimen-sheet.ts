/**
 * Ficha técnica de una muestra en PDF.
 */

import { Prisma } from '@prisma/client';
import { publicUserSelect } from '../../../common/prisma/user-select';
import {
  resolveTaxonomy,
  taxonomyInclude,
} from '../../../common/prisma/taxonomy';
import {
  COLORS,
  FONT,
  contentWidth,
  createDoc,
  ensureSpace,
  field,
  footer,
  formatDate,
  header,
  sectionTitle,
  toBuffer,
  today,
} from './pdf-kit';

export const sheetInclude = {
  ...taxonomyInclude,
  location: {
    include: {
      municipality: { include: { department: true } },
      locationType: true,
    },
  },
  venationType: true,
  formType: true,
  marginType: true,
  origin: true,
  originType: true,
  condition: true,
  habitat: true,
  project: { include: { protocol: true } },
  collectors: {
    include: { user: { select: publicUserSelect } },
    orderBy: [{ isPrincipal: 'desc' }, { assignedAt: 'asc' }],
  },
  images: {
    where: { isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    take: 1,
  },
} satisfies Prisma.SpecimenInclude;

export type SheetSpecimen = Prisma.SpecimenGetPayload<{
  include: typeof sheetInclude;
}>;

const join = (parts: (string | null | undefined)[], separator = ', ') =>
  parts.filter((part) => part && String(part).trim()).join(separator) || null;

function coordinates(
  latitude: Prisma.Decimal | null,
  longitude: Prisma.Decimal | null,
) {
  if (latitude == null || longitude == null) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'O'} (WGS84)`;
}

function elevation(
  min: number | null,
  max: number | null,
  altitude: number | null,
) {
  if (min != null && max != null && min !== max)
    return `${min} – ${max} m s. n. m.`;
  const value = min ?? max ?? altitude;
  return value != null ? `${value} m s. n. m.` : null;
}

export async function specimenSheetPdf(
  specimen: SheetSpecimen,
  options: {
    collection: string;
    image: Buffer | null;
    publicUrl: string | null;
  },
): Promise<Buffer> {
  const doc = createDoc({
    title: `Ficha técnica - ${specimen.scientificName}`,
  });
  header(doc, options.collection, 'Ficha técnica');

  const { left } = doc.page.margins;
  const width = contentWidth(doc);
  const taxonomy = resolveTaxonomy(specimen);

  // Nombre científico (cursiva) + autor. Las alturas se calculan a mano:
  // con "continued" pdfkit deja doc.y según la fuente pequeña y lo siguiente se monta
  const titleTop = doc.y;
  doc.font(FONT.italic).fontSize(20);
  const titleHeight = doc.heightOfString(
    specimen.scientificName + (specimen.author ? `  ${specimen.author}` : ''),
    { width },
  );
  doc.fillColor(COLORS.text).text(specimen.scientificName, left, titleTop, {
    width,
    continued: !!specimen.author,
  });
  if (specimen.author) {
    doc
      .font(FONT.regular)
      .fontSize(13)
      .fillColor(COLORS.muted)
      .text(`  ${specimen.author}`);
  }
  doc.y = titleTop + titleHeight + 2;
  if (specimen.commonName) {
    doc
      .font(FONT.regular)
      .fontSize(12)
      .fillColor(COLORS.muted)
      .text(specimen.commonName, left, doc.y, { width });
  }

  const meta = join(
    [
      `Catálogo ${specimen.catalogNumber}`,
      specimen.registryNumber && `N.º de colecta ${specimen.registryNumber}`,
      !specimen.isActive ? 'INACTIVA' : null,
    ],
    '   ·   ',
  );
  doc
    .font(FONT.bold)
    .fontSize(9)
    .fillColor(COLORS.brand)
    .text(meta ?? '', left, doc.y + 4, { width });
  doc.moveDown(0.8);

  // Imagen principal
  if (options.image) {
    const maxHeight = 250;
    ensureSpace(doc, maxHeight + 10);
    const top = doc.y;
    doc.image(options.image, left, top, {
      fit: [width, maxHeight],
      align: 'center',
      valign: 'center',
    });
    doc.y = top + maxHeight + 6;
    const caption = specimen.images[0]?.caption;
    if (caption) {
      doc
        .font(FONT.italic)
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(caption, left, doc.y, { width, align: 'center' });
    }
  }

  sectionTitle(doc, 'Taxonomía');
  if (!taxonomy.rank) field(doc, 'Clasificación', 'Sin clasificar');
  field(doc, 'División', taxonomy.division?.name);
  field(doc, 'Clase', taxonomy.class?.name);
  field(doc, 'Orden', taxonomy.order?.name);
  field(doc, 'Familia', taxonomy.family?.name);
  field(doc, 'Género', taxonomy.genus?.name, { italic: true });
  field(
    doc,
    'Especie',
    taxonomy.species
      ? `${taxonomy.genus?.name ?? ''} ${taxonomy.species.epithet}`.trim()
      : null,
    {
      italic: true,
    },
  );
  field(doc, 'Identificada hasta', taxonomy.rank);

  if (
    specimen.identifiedBy ||
    specimen.dateIdentified ||
    specimen.identificationNotes
  ) {
    sectionTitle(doc, 'Identificación');
    field(doc, 'Identificado por', specimen.identifiedBy);
    field(doc, 'Fecha', specimen.dateIdentified);
    field(doc, 'Notas', specimen.identificationNotes);
  }

  sectionTitle(doc, 'Recolección');
  field(
    doc,
    'Fecha de colecta',
    formatDate(specimen.collectionDate) ?? specimen.collectionYear,
  );
  field(
    doc,
    specimen.collectors.length + (specimen.otherCollectors ? 1 : 0) > 1
      ? 'Recolectores'
      : 'Recolector',
    join([
      ...specimen.collectors.map(
        (c) =>
          c.user.name +
          (c.collectorNumber ? ` (n.º ${c.collectorNumber})` : ''),
      ),
      ...(specimen.otherCollectors ?? '').split('|').map((name) => name.trim()),
    ]),
  );
  field(doc, 'Proyecto', specimen.project?.name);
  field(doc, 'Protocolo', specimen.project?.protocol?.name);

  const location = specimen.location;
  sectionTitle(doc, 'Ubicación');
  field(doc, 'Departamento', location?.municipality?.department?.name);
  field(doc, 'Municipio', location?.municipality?.name);
  field(
    doc,
    'Localidad',
    join(
      [
        location?.name,
        location?.locationType?.name && `(${location.locationType.name})`,
      ],
      ' ',
    ),
  );
  field(doc, 'Cuerpo de agua', location?.waterBody);
  field(
    doc,
    'Coordenadas',
    coordinates(specimen.latitude, specimen.longitude) ??
      (coordinates(location?.latitude ?? null, location?.longitude ?? null)
        ? `${coordinates(location!.latitude, location!.longitude)} — de la localidad`
        : null),
  );
  field(
    doc,
    'Elevación',
    elevation(specimen.minElevation, specimen.maxElevation, specimen.altitude),
  );
  if (!location && specimen.latitude == null)
    field(doc, 'Ubicación', 'Sin registrar');

  const individuals =
    specimen.adultsCount != null || specimen.juvenilesCount != null
      ? join([
          specimen.adultsCount != null
            ? `${specimen.adultsCount} adulto(s)`
            : null,
          specimen.juvenilesCount != null
            ? `${specimen.juvenilesCount} juvenil(es)`
            : null,
        ])
      : null;
  const characteristics = [
    ['Venación', specimen.venationType?.name],
    ['Forma de la hoja', specimen.formType?.name],
    ['Margen', specimen.marginType?.name],
    ['Origen', join([specimen.origin?.name, specimen.originType?.name], ' · ')],
    ['Condición', specimen.condition?.name],
    ['Hábitat', specimen.habitat?.name],
    ['Individuos', individuals],
  ] as const;
  if (characteristics.some(([, value]) => value)) {
    sectionTitle(doc, 'Características');
    for (const [label, value] of characteristics) field(doc, label, value);
  }

  if (specimen.localObservation || specimen.fieldNotes) {
    sectionTitle(doc, 'Observaciones');
    field(doc, 'Descripción', specimen.localObservation);
    field(doc, 'Notas de campo', specimen.fieldNotes);
  }

  footer(
    doc,
    join([`Generado el ${today()}`, options.publicUrl], '   ·   ') ?? '',
  );
  return toBuffer(doc);
}
