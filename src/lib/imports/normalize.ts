import { isDateString } from "@/lib/dates/week";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/campaigns/platforms";
import { parseNumber, type ParsedNumber } from "@/lib/validation/numbers";

// A raw cell from the file: CSV gives text; XLSX may also give numbers
// (number cells and Excel date serials)
export type Cell = string | number | null;

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

export function cellText(cell: Cell): string {
  if (cell === null) return "";
  return typeof cell === "number" ? String(cell) : cell.trim();
}

export function isBlank(cell: Cell): boolean {
  return cellText(cell) === "";
}

const pad = (n: number) => String(n).padStart(2, "0");

// Excel stores dates as days since 1899-12-30
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  return new Date(EXCEL_EPOCH + Math.floor(serial) * DAY_MS).toISOString().slice(0, 10);
}

const DAY_FIRST_RE = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;
const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT]\d{1,2}:\d{2}(?::\d{2})?)?$/;

export const INVALID_DATE_MESSAGE = "תאריך לא תקין (צריך להיות DD/MM/YYYY או YYYY-MM-DD)";

// DD/MM/YYYY or YYYY-MM-DD text, or an Excel date cell → "YYYY-MM-DD" (PRD 3.4)
export function parseImportDate(cell: Cell): Parsed<string> {
  let date: string | null = null;
  if (typeof cell === "number") {
    date = fromExcelSerial(cell);
  } else {
    const text = cellText(cell);
    const dayFirst = DAY_FIRST_RE.exec(text);
    const iso = ISO_RE.exec(text);
    if (dayFirst) date = `${dayFirst[3]}-${pad(Number(dayFirst[2]))}-${pad(Number(dayFirst[1]))}`;
    else if (iso) date = `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  }
  if (!date || !isDateString(date)) return { ok: false, message: INVALID_DATE_MESSAGE };
  return { ok: true, value: date };
}

const PLATFORM_ALIASES = new Map<string, Platform>();
for (const platform of PLATFORMS) {
  const label = PLATFORM_LABELS[platform].toLowerCase();
  PLATFORM_ALIASES.set(label, platform);
  PLATFORM_ALIASES.set(label.replace(/ ads$/, ""), platform);
}
for (const alias of ["facebook", "facebook ads", "instagram", "instagram ads"]) {
  PLATFORM_ALIASES.set(alias, "meta_ads");
}

// Platform names ignoring case and extra spaces; Facebook/Instagram → Meta Ads
export function parsePlatform(cell: Cell): Parsed<Platform> {
  const key = cellText(cell).toLowerCase().replace(/\s+/g, " ");
  const platform = PLATFORM_ALIASES.get(key);
  if (!platform) return { ok: false, message: `פלטפורמה לא מוכרת: ${cellText(cell)}` };
  return { ok: true, value: platform };
}

// A value cell. Text follows the form rules (parseNumber); an XLSX number cell
// keeps the same checks, with amounts rounded to agorot (Excel float leftovers).
export function parseImportNumber(cell: Cell, { integer = false }: { integer?: boolean } = {}): ParsedNumber {
  if (typeof cell !== "number") return parseNumber(cellText(cell), { integer });
  if (!Number.isFinite(cell)) return { ok: false, message: "יש להזין מספר" };
  const value = integer ? cell : Math.round(cell * 100) / 100;
  return parseNumber(String(value), { integer });
}

// Campaign identity in an import: name ignoring case and edge spaces + platform
export function campaignKey(name: string, platform: Platform): string {
  return `${name.trim().toLowerCase()}|${platform}`;
}
