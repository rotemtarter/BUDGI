import { FIELD_LABELS, INTEGER_FIELDS, VALUE_FIELDS, type ColumnMapping, type ValueField } from "./fields";
import { parseImportNumber } from "./normalize";
import type { ImportTable, RowError } from "./rows";

// Import into one campaign: every row (for example one ad) of the file is
// added up into the campaign's week for the typed dates.

export type WeekValues = Record<ValueField, number | null>;

export type CampaignSum = {
  totals: WeekValues;
  rowsSummed: number;
  // Rows without any value: nothing to add
  rowsSkipped: number;
  errors: RowError[];
};

// A field stays null ("not entered") when no row has a value for it
export function sumRows(table: ImportTable, mapping: ColumnMapping): CampaignSum {
  const totals = Object.fromEntries(VALUE_FIELDS.map((f) => [f, null])) as WeekValues;
  const errors: RowError[] = [];
  let rowsSummed = 0;
  let rowsSkipped = 0;

  for (const { line, cells } of table.rows) {
    const reasons: string[] = [];
    const values = {} as WeekValues;
    for (const field of VALUE_FIELDS) {
      const index = mapping[field];
      const parsed = parseImportNumber(index === null ? null : (cells[index] ?? null), {
        integer: INTEGER_FIELDS.includes(field),
      });
      if (parsed.ok) values[field] = parsed.value;
      else {
        values[field] = null;
        reasons.push(`${FIELD_LABELS[field]}: ${parsed.message}`);
      }
    }
    if (reasons.length > 0) {
      errors.push({ line, reasons });
      continue;
    }
    if (VALUE_FIELDS.every((field) => values[field] === null)) {
      rowsSkipped++;
      continue;
    }
    rowsSummed++;
    for (const field of VALUE_FIELDS) {
      if (values[field] !== null) totals[field] = (totals[field] ?? 0) + values[field];
    }
  }

  // Amounts in agorot, without float leftovers
  for (const field of ["spend", "revenue"] as const) {
    if (totals[field] !== null) totals[field] = Math.round(totals[field] * 100) / 100;
  }
  return { totals, rowsSummed, rowsSkipped, errors };
}
