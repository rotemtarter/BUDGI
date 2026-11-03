import "server-only";
import * as XLSX from "xlsx";
import { IMPORT_FIELDS } from "@/lib/imports/fields";

// The Budgi sample file (PRD 3.4): Hebrew headers and a few example rows that
// import as they are. Values are fixed; no cell starts with = + - @ (6.3).

export const TEMPLATE_FILE_NAME = "budgi-sample.xlsx";

const EXAMPLE_ROWS: (string | number | null)[][] = [
  ["קמפיין דוגמה – לידים", "Meta Ads", "04/10/2026", 1500, 30, 4, 3, 6000],
  ["קמפיין דוגמה – לידים", "Meta Ads", "11/10/2026", 1650, 34, 5, 4, 7200],
  ["קמפיין דוגמה – חיפוש", "Google Ads", "04/10/2026", 2200, 25, 6, 5, 9800],
  ["קמפיין דוגמה – חיפוש", "Google Ads", "11/10/2026", 2100, 22, null, 4, 8900],
];

export function buildTemplate(): Uint8Array {
  const sheet = XLSX.utils.aoa_to_sheet([IMPORT_FIELDS.map((f) => f.header), ...EXAMPLE_ROWS]);
  sheet["!cols"] = IMPORT_FIELDS.map((f) => ({ wch: Math.max(14, f.header.length + 4) }));
  sheet["!cols"][0] = { wch: 26 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "נתונים");
  workbook.Workbook = { ...workbook.Workbook, Views: [{ RTL: true }] };
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
}
