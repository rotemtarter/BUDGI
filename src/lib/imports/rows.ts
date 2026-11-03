import { startOfWeek } from "@/lib/dates/week";
import type { Platform } from "@/lib/campaigns/platforms";
import {
  FIELD_LABELS,
  INTEGER_FIELDS,
  periodWeek,
  MAX_CAMPAIGN_NAME,
  VALUE_FIELDS,
  type ColumnMapping,
  type ValueField,
} from "./fields";
import { campaignKey, cellText, parseImportDate, parseImportNumber, parsePlatform, type Cell } from "./normalize";

// The file as a table: header texts, and the non-blank data rows with their
// line number in the file (the header is line 1)
export type ImportTable = {
  headers: string[];
  rows: { line: number; cells: Cell[] }[];
};

export type ValidRow = {
  line: number;
  key: string;
  name: string;
  platform: Platform;
  weekStart: string;
} & Record<ValueField, number | null>;

export type RowError = { line: number; reasons: string[] };

// A row whose date was moved to the Sunday of its week
export type AdjustedDate = { line: number; date: string; weekStart: string };

export type ValidatedRows = {
  valid: ValidRow[];
  errors: RowError[];
  adjusted: AdjustedDate[];
};

const NO_VALUE_MESSAGE = "אין בשורה אף ערך מספרי";

// Checks every row against the mapping (PRD 3.4). Two rows for the same
// campaign and week are both errors.
export function validateRows(table: ImportTable, mapping: ColumnMapping): ValidatedRows {
  const cellOf = (cells: Cell[], index: number | null): Cell => (index === null ? null : (cells[index] ?? null));
  const candidates: ValidRow[] = [];
  const errors: RowError[] = [];
  const adjusted: AdjustedDate[] = [];

  for (const { line, cells } of table.rows) {
    const reasons: string[] = [];

    const name = cellText(cellOf(cells, mapping.name));
    if (name === "") reasons.push("חסר שם קמפיין");
    else if (name.length > MAX_CAMPAIGN_NAME) reasons.push(`שם הקמפיין ארוך מ-${MAX_CAMPAIGN_NAME} תווים`);

    // One platform for the whole file, or a column
    let platform: Platform | null = null;
    if (typeof mapping.platform === "string") platform = mapping.platform;
    else {
      const platformCell = cellOf(cells, mapping.platform);
      if (cellText(platformCell) === "") reasons.push("חסרה פלטפורמה");
      else {
        const parsed = parsePlatform(platformCell);
        if (parsed.ok) platform = parsed.value;
        else reasons.push(parsed.message);
      }
    }

    // Dates typed for the whole file, or a week column
    let date: string | null = null;
    if (mapping.period) date = periodWeek(mapping.period);
    else {
      const dateCell = cellOf(cells, mapping.week);
      if (cellText(dateCell) === "") reasons.push("חסר תאריך תחילת שבוע");
      else {
        const parsed = parseImportDate(dateCell);
        if (parsed.ok) date = parsed.value;
        else reasons.push(parsed.message);
      }
    }

    const values = {} as Record<ValueField, number | null>;
    let hasValueError = false;
    for (const field of VALUE_FIELDS) {
      const parsed = parseImportNumber(cellOf(cells, mapping[field]), { integer: INTEGER_FIELDS.includes(field) });
      if (parsed.ok) values[field] = parsed.value;
      else {
        values[field] = null;
        hasValueError = true;
        reasons.push(`${FIELD_LABELS[field]}: ${parsed.message}`);
      }
    }
    if (!hasValueError && VALUE_FIELDS.every((field) => values[field] === null)) reasons.push(NO_VALUE_MESSAGE);

    if (reasons.length > 0 || platform === null || date === null) {
      errors.push({ line, reasons });
      continue;
    }

    const weekStart = startOfWeek(date);
    if (weekStart !== date && !mapping.period) adjusted.push({ line, date, weekStart });
    candidates.push({ line, key: campaignKey(name, platform), name, platform, weekStart, ...values });
  }

  // Same campaign and week twice in the file: every row involved is an error
  const byWeek = new Map<string, ValidRow[]>();
  for (const row of candidates) {
    const id = `${row.key}|${row.weekStart}`;
    byWeek.set(id, [...(byWeek.get(id) ?? []), row]);
  }
  const valid: ValidRow[] = [];
  for (const row of candidates) {
    const group = byWeek.get(`${row.key}|${row.weekStart}`)!;
    if (group.length === 1) {
      valid.push(row);
      continue;
    }
    const others = group.filter((r) => r !== row).map((r) => r.line);
    errors.push({ line: row.line, reasons: [`כפולה: אותו קמפיין ואותו שבוע מופיעים גם בשורה ${others.join(", ")}`] });
  }

  errors.sort((a, b) => a.line - b.line);
  const validLines = new Set(valid.map((r) => r.line));
  return { valid, errors, adjusted: adjusted.filter((a) => validLines.has(a.line)) };
}
