import { addDays, startOfWeek } from "@/lib/dates/week";
import type { Platform } from "@/lib/campaigns/platforms";
import {
  FIELD_LABELS,
  INTEGER_FIELDS,
  isFullMonth,
  periodWeek,
  splitMonth,
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
  // One row per campaign and week, after adding up the file's rows
  valid: ValidRow[];
  errors: RowError[];
  adjusted: AdjustedDate[];
  // File rows that were added up with others of the same campaign and week
  combinedRows: number;
  // Rows with daily dates (several dates in one week)
  daily: boolean;
};

type ParsedRow = { line: number; key: string; name: string; platform: Platform; date: string } & Record<ValueField, number | null>;

function addValues(rows: Record<ValueField, number | null>[]): Record<ValueField, number | null> {
  const total = {} as Record<ValueField, number | null>;
  for (const field of VALUE_FIELDS) {
    const values = rows.map((r) => r[field]).filter((v): v is number => v !== null);
    total[field] = values.length === 0 ? null : values.reduce((a, b) => a + b, 0);
    // Amounts in agorot, without float leftovers
    if (total[field] !== null && !INTEGER_FIELDS.includes(field)) total[field] = Math.round(total[field] * 100) / 100;
  }
  return total;
}

function daysInRange(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

const NO_VALUE_MESSAGE = "אין בשורה אף ערך מספרי";

// Checks every row against the mapping (PRD 3.4). Rows of the same campaign
// and week are added up into one week row (for example daily rows, ADR-18).
// With a full month as the period, each campaign's total is split into the
// month's weeks (ADR-16).
export function validateRows(table: ImportTable, mapping: ColumnMapping): ValidatedRows {
  const cellOf = (cells: Cell[], index: number | null): Cell => (index === null ? null : (cells[index] ?? null));
  const parsedRows: ParsedRow[] = [];
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

    parsedRows.push({ line, key: campaignKey(name, platform), name, platform, date, ...values });
  }
  errors.sort((a, b) => a.line - b.line);

  // A full month: each campaign's total split into the month's weeks
  if (mapping.period && isFullMonth(mapping.period)) {
    const byCampaign = groupBy(parsedRows, (row) => row.key);
    const valid = [...byCampaign.values()].flatMap((rows) =>
      splitMonth(mapping.period!, addValues(rows)).map((week) => ({
        line: rows[0].line,
        key: rows[0].key,
        name: rows[0].name,
        platform: rows[0].platform,
        ...week,
      })),
    );
    return { valid, errors, adjusted: [], combinedRows: parsedRows.length - byCampaign.size, daily: false };
  }

  // Rows of the same campaign and week are added up
  const byWeek = groupBy(parsedRows, (row) => `${row.key}|${startOfWeek(row.date)}`);
  // Daily rows: a campaign has several dates in one week
  const daily = [...byWeek.values()].some((rows) => new Set(rows.map((r) => r.date)).size > 1);

  // Daily rows of whole months (from a 1st to a month's last day): the first
  // and last week have days outside the file. Such a week holds a whole week
  // at the pace of its days in the file, like a split month (ADR-16), so each
  // month's total equals the file's.
  const dates = parsedRows.map((r) => r.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const wholeMonths = daily && first.endsWith("-01") && addDays(last, 1).endsWith("-01");
  const scaleOf = (weekStart: string) => {
    if (!wholeMonths) return 1;
    const from = weekStart < first ? first : weekStart;
    const to = addDays(weekStart, 6) > last ? last : addDays(weekStart, 6);
    return 7 / daysInRange(from, to);
  };

  const valid: ValidRow[] = [...byWeek.values()].map((rows) => {
    const weekStart = startOfWeek(rows[0].date);
    const values = addValues(rows);
    const scale = scaleOf(weekStart);
    if (scale !== 1) {
      for (const field of VALUE_FIELDS) {
        const value = values[field];
        if (value === null) continue;
        values[field] = INTEGER_FIELDS.includes(field) ? Math.round(value * scale) : Math.round(value * scale * 100) / 100;
      }
    }
    return { line: rows[0].line, key: rows[0].key, name: rows[0].name, platform: rows[0].platform, weekStart, ...values };
  });

  // Dates moved to their Sunday; not listed for daily rows, where it is expected
  if (!daily) {
    for (const row of parsedRows) {
      const weekStart = startOfWeek(row.date);
      if (weekStart !== row.date && !mapping.period) adjusted.push({ line: row.line, date: row.date, weekStart });
    }
  }
  return { valid, errors, adjusted, combinedRows: parsedRows.length - valid.length, daily };
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
