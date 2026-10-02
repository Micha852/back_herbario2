/**
 * Etiqueta de herbario (formato HDUA): la foto del pliego ocupa la hoja y la ficha
 * va en un recuadro en la esquina inferior derecha, como la etiqueta física.
 */

import { resolveTaxonomy } from '../../../common/prisma/taxonomy';
import { COLORS, FONT, createDoc, formatDate, toBuffer } from './pdf-kit';
import type { SheetSpecimen } from './specimen-sheet';

/** 1.0844 → "1° 5' 3,8''" */
export function toDms(value: number): string {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}° ${minutes}' ${seconds.toFixed(1).replace('.', ',')}''`;
}

const sentence = (text: string | null | undefined) => {
  const t = text?.trim();
  if (!t) return null;
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/** Texto de procedencia: "COLOMBIA, Dpto Caquetá, Municipio Florencia. Localidad. N 1° … – W 75° …. 240 – 280 msnm." */
export function provenance(
  specimen: SheetSpecimen,
  country: string,
): string | null {
  const location = specimen.location;
  const department = location?.municipality?.department?.name;
  const municipality = location?.municipality?.name;
  const lat = specimen.latitude ?? location?.latitude ?? null;
  const lng = specimen.longitude ?? location?.longitude ?? null;

  const place = [
    country.toUpperCase(),
    department && `Dpto ${department}`,
    municipality && `Municipio ${municipality}`,
  ]
    .filter(Boolean)
    .join(', ');
  const coords =
    lat != null && lng != null
      ? `${Number(lat) >= 0 ? 'N' : 'S'} ${toDms(Number(lat))} – ${Number(lng) >= 0 ? 'E' : 'W'} ${toDms(Number(lng))}`
      : null;
  const min = specimen.minElevation ?? specimen.altitude;
  const max = specimen.maxElevation ?? specimen.altitude;
  const elevation =
    min != null && max != null && min !== max
      ? `${min} – ${max} msnm`
      : (min ?? max) != null
        ? `${min ?? max} msnm`
        : null;

  const parts = [
    sentence(place),
    sentence(location?.name),
    sentence(coords),
    sentence(elevation),
  ].filter(Boolean);
  return location || coords ? parts.join(' ') : null;
}

export async function herbariumLabelPdf(
  specimen: SheetSpecimen,
  options: {
    /** Encabezado de la etiqueta, p. ej. "HERBARIO UNIAMAZONÍA (HUAZ)" */
    title: string;
    country: string;
    image: { buffer: Buffer; width: number; height: number };
  },
): Promise<Buffer> {
  const landscape = options.image.width > options.image.height;
  const doc = createDoc({
    title: `Etiqueta - ${specimen.scientificName}`,
    layout: landscape ? 'landscape' : 'portrait',
  });
  const margin = 18;
  doc.page.margins = {
    top: margin,
    bottom: margin,
    left: margin,
    right: margin,
  };

  // Imagen lo más grande posible, centrada
  const areaW = doc.page.width - margin * 2;
  const areaH = doc.page.height - margin * 2;
  const scale = Math.min(
    areaW / options.image.width,
    areaH / options.image.height,
  );
  const imgW = options.image.width * scale;
  const imgH = options.image.height * scale;
  const imgX = (doc.page.width - imgW) / 2;
  const imgY = (doc.page.height - imgH) / 2;
  doc.image(options.image.buffer, imgX, imgY, { width: imgW, height: imgH });

  // Contenido de la etiqueta
  const taxonomy = resolveTaxonomy(specimen);
  const collectors = [
    ...specimen.collectors.map((c) => c.user.name),
    ...(specimen.otherCollectors ?? '').split('|').map((n) => n.trim()),
  ].filter(Boolean);
  const description = sentence(
    [
      specimen.localObservation?.trim().replace(/[.\s]+$/, ''),
      specimen.habitat?.name && `Hábitat: ${specimen.habitat.name}`,
    ]
      .filter(Boolean)
      .join('. '),
  );
  const date =
    formatDate(specimen.collectionDate) ??
    (specimen.collectionYear ? String(specimen.collectionYear) : null);

  const boxW = Math.min(imgW * (landscape ? 0.36 : 0.46), 270);
  const pad = 8;
  const textW = boxW - pad * 2;
  const base = 7.5;

  // Bloques: [texto, fuente, tamaño, alineación, espacio antes]
  type Block = {
    text: string;
    font: string;
    size: number;
    align?: 'center' | 'left' | 'justify';
    gap?: number;
    italicTail?: string;
  };
  const blocks: Block[] = [
    { text: options.title, font: FONT.bold, size: base + 1, align: 'center' },
    ...(taxonomy.family
      ? [
          {
            text: taxonomy.family.name.toUpperCase(),
            font: FONT.regular,
            size: base + 0.5,
            gap: 6,
          },
        ]
      : []),
    {
      text: specimen.scientificName,
      font: FONT.italic,
      size: base + 0.5,
      gap: taxonomy.family ? 1 : 6,
      italicTail: specimen.author ?? undefined,
    },
    ...(specimen.identifiedBy
      ? [
          {
            text: `DET: ${specimen.identifiedBy}${specimen.dateIdentified ? ` (${specimen.dateIdentified})` : ''}`,
            font: FONT.regular,
            size: base,
            gap: 1,
          },
        ]
      : []),
    ...(specimen.commonName
      ? [
          {
            text: `Nombre común: ${specimen.commonName}`,
            font: FONT.regular,
            size: base,
            gap: 1,
          },
        ]
      : []),
    ...(description
      ? [
          {
            text: description,
            font: FONT.regular,
            size: base,
            align: 'justify' as const,
            gap: 5,
          },
        ]
      : []),
    ...(() => {
      const text = provenance(specimen, options.country);
      return text
        ? [
            {
              text,
              font: FONT.regular,
              size: base,
              align: 'justify' as const,
              gap: 5,
            },
          ]
        : [];
    })(),
    ...(collectors.length
      ? [
          {
            text: `${collectors.length > 1 ? 'Colectores' : 'Colector'}: ${collectors.join(', ')}.`,
            font: FONT.regular,
            size: base,
            align: 'justify' as const,
            gap: 5,
          },
        ]
      : []),
  ];

  const measure = (b: Block) => {
    doc.font(b.font).fontSize(b.size);
    return doc.heightOfString(
      b.italicTail ? `${b.text} ${b.italicTail}` : b.text,
      { width: textW, align: b.align },
    );
  };
  const footerH = base + 4;
  const projectText = specimen.project?.name
    ? `Proyecto ${specimen.project.name}`
    : null;
  doc.font(FONT.regular).fontSize(base);
  const projectH = projectText
    ? doc.heightOfString(projectText, { width: textW, align: 'center' }) + 2
    : 0;
  const contentH =
    blocks.reduce((sum, b) => sum + (b.gap ?? 0) + measure(b), 0) +
    6 +
    footerH +
    projectH;
  const boxH = contentH + pad * 2;

  const boxX = imgX + imgW - boxW - 6;
  const boxY = imgY + imgH - boxH - 6;
  doc
    .rect(boxX, boxY, boxW, boxH)
    .fillColor('#FFFFFF')
    .fillOpacity(0.96)
    .fill()
    .fillOpacity(1);
  doc
    .rect(boxX, boxY, boxW, boxH)
    .lineWidth(0.5)
    .strokeColor('#D1D5DB')
    .stroke();

  let y = boxY + pad;
  const x = boxX + pad;
  for (const b of blocks) {
    y += b.gap ?? 0;
    doc.font(b.font).fontSize(b.size).fillColor(COLORS.text);
    if (b.italicTail) {
      doc.text(b.text, x, y, { width: textW, continued: true });
      doc.font(FONT.regular).text(` ${b.italicTail}`);
    } else {
      doc.text(b.text, x, y, { width: textW, align: b.align ?? 'left' });
    }
    y += measure(b);
  }

  // Pie: número de catálogo (izq.) y fecha de colecta (der.), luego el proyecto
  y += 6;
  doc
    .font(FONT.bold)
    .fontSize(base + 0.5)
    .fillColor(COLORS.text)
    .text(specimen.catalogNumber, x, y, { width: textW, lineBreak: false });
  if (date)
    doc
      .font(FONT.regular)
      .fontSize(base)
      .text(date, x, y + 0.5, {
        width: textW,
        align: 'right',
        lineBreak: false,
      });
  y += footerH;
  if (projectText)
    doc
      .font(FONT.regular)
      .fontSize(base)
      .text(projectText, x, y, { width: textW, align: 'center' });

  return toBuffer(doc);
}
