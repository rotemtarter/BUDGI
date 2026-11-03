import "server-only";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { MAX_DATA_ROWS, MAX_FILE_BYTES } from "@/lib/imports/fields";
import { FILE_MESSAGES } from "@/lib/imports/messages";
import { cellText, isBlank, type Cell } from "@/lib/imports/normalize";
import type { ImportTable } from "@/lib/imports/rows";

// Reads an uploaded CSV or XLSX file into a table, on the server only
// (ARCHITECTURE.md 5.2, 6.3). Nothing is stored.

export class ImportFileError extends Error {}

export type UploadedFile = { name: string; bytes: Uint8Array };

type RawRow = { line: number; cells: Cell[] };

function fail(message: string): never {
  throw new ImportFileError(message);
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

// ZIP local file header: every XLSX starts with it
function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

// UTF-8 (with or without BOM); otherwise Windows-1255, the encoding Hebrew
// Excel uses when saving CSV
function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1255").decode(bytes);
  }
}

function readCsv(bytes: Uint8Array): RawRow[] {
  if (bytes.includes(0)) fail(FILE_MESSAGES.unsupported);
  const result = Papa.parse<string[]>(decodeText(bytes), { skipEmptyLines: false });
  return result.data.map((cells, index) => ({ line: index + 1, cells }));
}

function cellValue(cell: XLSX.CellObject | undefined): Cell {
  if (!cell) return null;
  switch (cell.t) {
    case "n":
      return typeof cell.v === "number" ? cell.v : null;
    case "s":
      return typeof cell.v === "string" ? cell.v : null;
    case "b":
      return String(cell.v);
    case "e":
      // Excel error cell such as "#DIV/0!": kept as text so it is reported
      return cell.w ?? "#ERROR";
    default:
      return null;
  }
}

function readXlsx(bytes: Uint8Array): RawRow[] {
  if (!isZip(bytes)) fail(FILE_MESSAGES.unsupported);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellText: false,
      cellDates: false,
      // Stop reading early on huge sheets; more than the limit is an error anyway
      sheetRows: MAX_DATA_ROWS * 2 + 2,
    });
  } catch {
    fail(FILE_MESSAGES.unreadable);
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const data = sheet["!data"] ?? [];
  const rows: RawRow[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: Cell[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) cells.push(cellValue(data[r]?.[c]));
    rows.push({ line: r + 1, cells });
  }
  return rows;
}

// First non-blank row is the header row; blank rows are skipped but keep
// their place in the line numbers
function toTable(raw: RawRow[]): ImportTable {
  const nonBlank = raw.filter((row) => row.cells.some((cell) => !isBlank(cell)));
  if (nonBlank.length === 0) fail(FILE_MESSAGES.empty);
  const [header, ...rows] = nonBlank;
  if (rows.length === 0) fail(FILE_MESSAGES.noData);
  if (rows.length > MAX_DATA_ROWS) fail(FILE_MESSAGES.tooManyRows);

  // Up to the last column that has any value
  let columns = 0;
  for (const row of nonBlank) {
    row.cells.forEach((cell, index) => {
      if (!isBlank(cell)) columns = Math.max(columns, index + 1);
    });
  }
  const headers = Array.from({ length: columns }, (_, i) => cellText(header.cells[i] ?? null) || `עמודה ${i + 1}`);
  return {
    headers,
    rows: rows.map((row) => ({ line: row.line, cells: Array.from({ length: columns }, (_, i) => row.cells[i] ?? null) })),
  };
}

export function readImportFile(file: UploadedFile): ImportTable {
  if (file.bytes.length === 0) fail(FILE_MESSAGES.empty);
  if (file.bytes.length > MAX_FILE_BYTES) fail(FILE_MESSAGES.tooBig);

  const ext = extension(file.name);
  if (ext === "csv") return toTable(readCsv(file.bytes));
  if (ext === "xlsx") return toTable(readXlsx(file.bytes));
  fail(FILE_MESSAGES.unsupported);
}
