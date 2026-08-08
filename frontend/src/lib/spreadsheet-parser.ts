import Papa from "papaparse";
import ExcelJS from "exceljs";

import type { UploadMetadata } from "@/types/lead-list.types";

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
  uploadMetadata: UploadMetadata;
}

export class UnsupportedFileError extends Error {}

function getExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
  return match ? match[1] : "";
}

function parseCsvFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({ headers: results.meta.fields ?? [], rows: results.data });
      },
      error: (error: Error) => reject(error),
    });
  });
}

function formatCellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((fragment) => fragment.text).join("");
    }
    if ("result" in value) return String(value.result ?? "");
    return "";
  }

  return String(value);
}

async function parseXlsxFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new UnsupportedFileError("This spreadsheet doesn't have any sheets to import.");
  }

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = formatCellValue(cell.value).trim();
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const rowObject: Record<string, string> = {};
    let hasValue = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;

      const value = formatCellValue(cell.value);
      rowObject[header] = value;
      if (value) hasValue = true;
    });

    if (hasValue) rows.push(rowObject);
  });

  return { headers: headers.filter(Boolean), rows };
}

/** Parses a CSV or XLSX file entirely client-side — the column-mapping modal
 * needs headers + rows immediately, with no server round trip. Legacy binary
 * .xls isn't supported: the only capable parser (SheetJS/xlsx) has an
 * unpatched high-severity vulnerability, so it was deliberately left out. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const extension = getExtension(file.name);

  if (extension === "xls") {
    throw new UnsupportedFileError(
      "Legacy .xls files aren't supported — please save this file as .xlsx or .csv and try again."
    );
  }

  if (extension !== "csv" && extension !== "xlsx") {
    throw new UnsupportedFileError("Please upload a .csv or .xlsx file.");
  }

  const { headers, rows } =
    extension === "csv" ? await parseCsvFile(file) : await parseXlsxFile(file);

  if (headers.length === 0) {
    throw new UnsupportedFileError("This file doesn't have any columns we can read.");
  }

  return {
    headers,
    rows,
    uploadMetadata: {
      originalFileName: file.name,
      fileType: extension,
      fileSizeBytes: file.size,
      totalRows: rows.length,
    },
  };
}
