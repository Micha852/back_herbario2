/**
 * Archivos Darwin Core: CSV (RFC 4180, UTF-8 con BOM para Excel) y Excel (.xlsx).
 */

import * as ExcelJS from 'exceljs';
import { DWC_TERMS, DwcRecord, DwcValue } from './dwc-terms';

/** Escapa un valor CSV: comillas dobles, y entre comillas si tiene , " o saltos de línea */
export function csvCell(value: DwcValue): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function toCsv(records: DwcRecord[]): Buffer {
  const lines = [
    DWC_TERMS.join(','),
    ...records.map((record) =>
      DWC_TERMS.map((term) => csvCell(record[term])).join(','),
    ),
  ];
  return Buffer.from('﻿' + lines.join('\r\n') + '\r\n', 'utf8');
}

export async function toXlsx(
  records: DwcRecord[],
  sheetName = 'Darwin Core',
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Herbario Digital';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = DWC_TERMS.map((term) => ({
    header: term,
    key: term,
    width: Math.min(40, Math.max(12, term.length + 2)),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: DWC_TERMS.length },
  };

  for (const record of records) sheet.addRow(record);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
