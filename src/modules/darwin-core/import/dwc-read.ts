/**
 * Lectura de archivos Darwin Core (.xlsx o .csv) a filas { término: valor }.
 * Toma la primera hoja que tenga las columnas catalogNumber y scientificName.
 */

import * as ExcelJS from 'exceljs';
import { DWC_TERMS, DwcTerm } from '../dwc-terms';

export type RawValue = string | number | boolean | Date | null;
export type RawRow = Partial<Record<DwcTerm, RawValue>>;

export interface ReadResult {
  sheetName: string | null;
  rows: { line: number; values: RawRow }[];
  /** Columnas del archivo que no son términos del sistema (se ignoran) */
  ignoredColumns: string[];
}

export class DwcReadError extends Error {}

const REQUIRED: DwcTerm[] = ['catalogNumber', 'scientificName'];
const TERM_BY_LOWER = new Map<string, DwcTerm>(
  DWC_TERMS.map((term) => [term.toLowerCase(), term]),
);

/** Valor de celda de exceljs → valor plano */
function cellValue(value: ExcelJS.CellValue): RawValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value !== 'object') {
    return typeof value === 'string' ? value.trim() || null : value;
  }
  if ('richText' in value)
    return (
      value.richText
        .map((part) => part.text)
        .join('')
        .trim() || null
    );
  if ('result' in value) return cellValue(value.result as ExcelJS.CellValue);
  if ('text' in value) return String(value.text).trim() || null;
  if ('error' in value) return null;
  return null;
}

function mapHeaders(headers: (string | null)[]) {
  const columns = headers.map((header) =>
    header ? (TERM_BY_LOWER.get(header.trim().toLowerCase()) ?? null) : null,
  );
  const ignoredColumns = headers.filter(
    (header, i): header is string => !!header && !columns[i],
  );
  return { columns, ignoredColumns };
}

function hasRequired(columns: (DwcTerm | null)[]) {
  return REQUIRED.every((term) => columns.includes(term));
}

function buildRows(
  data: { line: number; cells: RawValue[] }[],
  columns: (DwcTerm | null)[],
) {
  const rows: ReadResult['rows'] = [];
  for (const { line, cells } of data) {
    const values: RawRow = {};
    columns.forEach((term, i) => {
      if (
        term &&
        cells[i] !== null &&
        cells[i] !== undefined &&
        cells[i] !== ''
      ) {
        values[term] = cells[i];
      }
    });
    // Filas vacías (o solo con valores constantes de la colección) no cuentan
    if (values.catalogNumber || values.scientificName)
      rows.push({ line, values });
  }
  return rows;
}

export async function readXlsx(buffer: Buffer): Promise<ReadResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new DwcReadError(
      'No se pudo leer el archivo: ¿es un Excel (.xlsx) válido?',
    );
  }

  for (const sheet of workbook.worksheets) {
    const headerRow = sheet.getRow(1);
    const headers: (string | null)[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const value = cellValue(cell.value);
      headers[col - 1] = value === null ? null : String(value);
    });
    const { columns, ignoredColumns } = mapHeaders(headers);
    if (!hasRequired(columns)) continue;

    const data: { line: number; cells: RawValue[] }[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, line) => {
      if (line === 1) return;
      const cells: RawValue[] = [];
      for (let col = 1; col <= columns.length; col++) {
        cells.push(cellValue(row.getCell(col).value));
      }
      data.push({ line, cells });
    });
    return {
      sheetName: sheet.name,
      rows: buildRows(data, columns),
      ignoredColumns,
    };
  }

  throw new DwcReadError(
    'No se encontró una hoja con las columnas catalogNumber y scientificName en la primera fila',
  );
}

/** CSV RFC 4180 (separador coma o punto y coma, detectado en la cabecera) */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.slice(0, clean.search(/\r?\n|$/));
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ';'
      : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function readCsv(buffer: Buffer): ReadResult {
  const [headers = [], ...lines] = parseCsv(buffer.toString('utf8'));
  const { columns, ignoredColumns } = mapHeaders(headers);
  if (!hasRequired(columns)) {
    throw new DwcReadError(
      'El CSV debe tener en la primera fila las columnas catalogNumber y scientificName',
    );
  }
  const data = lines.map((cells, i) => ({
    line: i + 2,
    cells: cells.map((cell) => cell.trim() || null),
  }));
  return { sheetName: null, rows: buildRows(data, columns), ignoredColumns };
}

export async function readDwcFile(
  buffer: Buffer,
  filename: string,
): Promise<ReadResult> {
  const name = filename.toLowerCase();
  if (name.endsWith('.xlsx')) return readXlsx(buffer);
  if (name.endsWith('.csv')) return readCsv(buffer);
  throw new DwcReadError('Formato no soportado: sube un archivo .xlsx o .csv');
}
