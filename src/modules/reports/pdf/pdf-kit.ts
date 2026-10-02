/**
 * Utilidades comunes para los PDF (pdfkit con fuentes estándar: soportan tildes y ñ).
 */

// pdfkit es CommonJS (module.exports = clase) y el proyecto no usa esModuleInterop
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');

export type Doc = PDFKit.PDFDocument;

export const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  light: '#9CA3AF',
  line: '#E5E7EB',
  zebra: '#F9FAFB',
  brand: '#15803D',
  brandLight: '#DCFCE7',
};

export const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
};

export function createDoc(options: {
  title: string;
  layout?: 'portrait' | 'landscape';
}): Doc {
  return new PDFDocument({
    size: 'LETTER',
    layout: options.layout ?? 'portrait',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    info: { Title: options.title, Creator: 'Herbario Digital' },
  });
}

/** Termina el documento y devuelve el PDF como Buffer */
export function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export const contentWidth = (doc: Doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

export const bottomLimit = (doc: Doc) =>
  doc.page.height - doc.page.margins.bottom;

/** Salta de página si no caben `height` puntos más */
export function ensureSpace(doc: Doc, height: number) {
  if (doc.y + height > bottomLimit(doc)) doc.addPage();
}

/** Encabezado: colección a la izquierda, tipo de documento a la derecha y una línea */
export function header(doc: Doc, collection: string, kind: string) {
  const { left } = doc.page.margins;
  const width = contentWidth(doc);
  const top = doc.page.margins.top;
  doc
    .font(FONT.bold)
    .fontSize(9)
    .fillColor(COLORS.brand)
    .text(collection.toUpperCase(), left, top, {
      width: width * 0.7,
      lineBreak: false,
    });
  doc
    .font(FONT.regular)
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(kind, left, top, { width, align: 'right', lineBreak: false });
  doc
    .moveTo(left, top + 16)
    .lineTo(left + width, top + 16)
    .lineWidth(1)
    .strokeColor(COLORS.brand)
    .stroke();
  doc.x = left;
  doc.y = top + 28;
}

/** Pie en todas las páginas: texto a la izquierda y "Página n de m" */
export function footer(doc: Doc, text: string) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const { left, bottom } = doc.page.margins;
    const width = contentWidth(doc);
    const y = doc.page.height - bottom + 22;
    // Escribir dentro del margen inferior sin que pdfkit agregue páginas
    doc.page.margins.bottom = 0;
    doc.font(FONT.regular).fontSize(8).fillColor(COLORS.light);
    doc.text(text, left, y, { width: width * 0.8, lineBreak: false });
    doc.text(`Página ${i - range.start + 1} de ${range.count}`, left, y, {
      width,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = bottom;
  }
}

/** Título de sección con línea suave */
export function sectionTitle(doc: Doc, title: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  const { left } = doc.page.margins;
  doc
    .font(FONT.bold)
    .fontSize(11)
    .fillColor(COLORS.brand)
    .text(title, left, doc.y);
  const y = doc.y + 2;
  doc
    .moveTo(left, y)
    .lineTo(left + contentWidth(doc), y)
    .lineWidth(0.5)
    .strokeColor(COLORS.line)
    .stroke();
  doc.y = y + 6;
}

/** Fila etiqueta / valor; omite valores vacíos. Devuelve si se escribió */
export function field(
  doc: Doc,
  label: string,
  value: string | number | null | undefined,
  options: { italic?: boolean; labelWidth?: number } = {},
): boolean {
  if (value === null || value === undefined || value === '') return false;
  const text = String(value);
  const { left } = doc.page.margins;
  const labelWidth = options.labelWidth ?? 140;
  const valueWidth = contentWidth(doc) - labelWidth;
  const font = options.italic ? FONT.italic : FONT.regular;

  doc.font(font).fontSize(10);
  const height = Math.max(doc.heightOfString(text, { width: valueWidth }), 12);
  ensureSpace(doc, height + 4);

  const y = doc.y;
  doc
    .font(FONT.regular)
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(label, left, y + 1, { width: labelWidth - 10 });
  doc
    .font(font)
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(text, left + labelWidth, y, { width: valueWidth });
  doc.y = Math.max(doc.y, y + height) + 4;
  doc.x = left;
  return true;
}

export const formatDate = (date: Date | null | undefined) =>
  date
    ? `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
    : null;

export const today = () => formatDate(new Date());
