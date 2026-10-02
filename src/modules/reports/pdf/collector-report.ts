/**
 * Informe "muestras por recolector" en PDF (tabla horizontal) y Excel.
 */

import * as ExcelJS from 'exceljs';
import {
  COLORS,
  FONT,
  bottomLimit,
  contentWidth,
  createDoc,
  footer,
  header,
  toBuffer,
  today,
} from './pdf-kit';

export interface CollectorReportRow {
  catalogNumber: string;
  scientificName: string;
  commonName: string | null;
  family: string | null;
  order: string | null;
  date: string | null;
  year: number | null;
  department: string | null;
  municipality: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  project: string | null;
  isActive: boolean;
}

export interface CollectorReportData {
  collection: string;
  collector: string;
  /** "Del 01/01/2020 al 31/12/2020", "Todas las fechas"... */
  period: string;
  rows: CollectorReportRow[];
}

function summary(data: CollectorReportData) {
  const families = new Set(data.rows.map((r) => r.family).filter(Boolean)).size;
  const years = data.rows
    .map((r) => r.year)
    .filter((y): y is number => y != null);
  const range = years.length
    ? Math.min(...years) === Math.max(...years)
      ? String(years[0])
      : `${Math.min(...years)} – ${Math.max(...years)}`
    : '—';
  return { total: data.rows.length, families, range };
}

const COLUMNS = [
  { key: 'catalogNumber', label: 'Catálogo', width: 0.12 },
  {
    key: 'scientificName',
    label: 'Nombre científico',
    width: 0.26,
    italic: true,
  },
  { key: 'family', label: 'Familia', width: 0.15 },
  { key: 'date', label: 'Fecha', width: 0.1 },
  { key: 'place', label: 'Localidad', width: 0.37 },
] as const;

export async function collectorReportPdf(
  data: CollectorReportData,
): Promise<Buffer> {
  const doc = createDoc({
    title: `Muestras de ${data.collector}`,
    layout: 'landscape',
  });
  header(doc, data.collection, 'Informe por recolector');

  const { left } = doc.page.margins;
  const width = contentWidth(doc);
  const stats = summary(data);

  doc
    .font(FONT.bold)
    .fontSize(18)
    .fillColor(COLORS.text)
    .text(data.collector, left, doc.y, { width });
  doc
    .font(FONT.regular)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(data.period, { width });
  doc.moveDown(0.6);

  // Resumen en tres recuadros
  const boxWidth = (width - 20) / 3;
  const boxTop = doc.y;
  [
    ['Muestras', String(stats.total)],
    ['Familias', String(stats.families)],
    ['Años de colecta', stats.range],
  ].forEach(([label, value], i) => {
    const x = left + i * (boxWidth + 10);
    doc
      .roundedRect(x, boxTop, boxWidth, 46, 4)
      .fillColor(COLORS.brandLight)
      .fill();
    doc
      .font(FONT.bold)
      .fontSize(16)
      .fillColor(COLORS.brand)
      .text(value, x + 12, boxTop + 8, { width: boxWidth - 24 });
    doc
      .font(FONT.regular)
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(label, x + 12, boxTop + 29, { width: boxWidth - 24 });
  });
  doc.y = boxTop + 62;

  const cols = COLUMNS.map((c) => ({ ...c, w: c.width * width }));
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(left, y, width, 20).fillColor(COLORS.brand).fill();
    let x = left;
    for (const col of cols) {
      doc
        .font(FONT.bold)
        .fontSize(9)
        .fillColor('#FFFFFF')
        .text(col.label, x + 6, y + 6, { width: col.w - 12, lineBreak: false });
      x += col.w;
    }
    doc.y = y + 20;
  };

  if (data.rows.length === 0) {
    doc
      .font(FONT.italic)
      .fontSize(11)
      .fillColor(COLORS.muted)
      .text('No hay muestras en este periodo.', left, doc.y);
  } else {
    drawHeader();
    data.rows.forEach((row, index) => {
      const values: Record<string, string> = {
        catalogNumber: row.catalogNumber + (row.isActive ? '' : ' (inactiva)'),
        scientificName: row.scientificName,
        family: row.family ?? '—',
        date: row.date ?? (row.year ? String(row.year) : '—'),
        place:
          [row.locality, row.municipality, row.department]
            .filter(Boolean)
            .join(', ') || '—',
      };
      const height =
        Math.max(
          ...cols.map((col) => {
            doc
              .font('italic' in col && col.italic ? FONT.italic : FONT.regular)
              .fontSize(9);
            return doc.heightOfString(values[col.key], { width: col.w - 12 });
          }),
        ) + 10;
      if (doc.y + height > bottomLimit(doc)) {
        doc.addPage();
        header(doc, data.collection, 'Informe por recolector');
        drawHeader();
      }
      const y = doc.y;
      if (index % 2 === 1)
        doc.rect(left, y, width, height).fillColor(COLORS.zebra).fill();
      let x = left;
      for (const col of cols) {
        doc
          .font('italic' in col && col.italic ? FONT.italic : FONT.regular)
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(values[col.key], x + 6, y + 5, { width: col.w - 12 });
        x += col.w;
      }
      doc.y = y + height;
    });
  }

  footer(doc, `Generado el ${today()}   ·   ${stats.total} muestra(s)`);
  return toBuffer(doc);
}

export async function collectorReportXlsx(
  data: CollectorReportData,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Herbario Digital';
  const sheet = workbook.addWorksheet('Muestras');
  const stats = summary(data);

  sheet.addRow([data.collection]).font = {
    bold: true,
    color: { argb: 'FF15803D' },
  };
  sheet.addRow([`Muestras recolectadas por ${data.collector}`]).font = {
    bold: true,
    size: 14,
  };
  sheet.addRow([data.period]);
  sheet.addRow([
    `${stats.total} muestra(s) · ${stats.families} familia(s) · años ${stats.range} · generado el ${today()}`,
  ]);
  sheet.addRow([]);

  const headers = [
    ['Catálogo', 14],
    ['Nombre científico', 32],
    ['Nombre común', 22],
    ['Orden', 16],
    ['Familia', 18],
    ['Fecha de colecta', 14],
    ['Año', 8],
    ['Departamento', 16],
    ['Municipio', 16],
    ['Localidad', 28],
    ['Latitud', 12],
    ['Longitud', 12],
    ['Proyecto', 24],
    ['Estado', 10],
  ] as const;
  const headerRow = sheet.addRow(headers.map(([label]) => label));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF15803D' },
    };
  });
  headers.forEach(([, width], i) => (sheet.getColumn(i + 1).width = width));
  sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: headers.length },
  };

  for (const row of data.rows) {
    const added = sheet.addRow([
      row.catalogNumber,
      row.scientificName,
      row.commonName,
      row.order,
      row.family,
      row.date,
      row.year,
      row.department,
      row.municipality,
      row.locality,
      row.latitude,
      row.longitude,
      row.project,
      row.isActive ? 'Activa' : 'Inactiva',
    ]);
    added.getCell(2).font = { italic: true };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
