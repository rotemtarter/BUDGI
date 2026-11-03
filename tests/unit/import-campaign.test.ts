import { describe, expect, it } from "vitest";
import { sumRows } from "@/lib/imports/campaign";
import { emptyMapping } from "@/lib/imports/fields";
import { validateMapping } from "@/lib/imports/mapping";
import type { ImportTable } from "@/lib/imports/rows";
import type { Cell } from "@/lib/imports/normalize";

// Import into one campaign: rows (for example one per ad) added up into one week
function table(rows: Cell[][]): ImportTable {
  return { headers: ["Ad name", "Spend", "Leads", "Deals"], rows: rows.map((cells, i) => ({ line: i + 2, cells })) };
}
const mapping = { ...emptyMapping(), spend: 1, leads: 2, deals: 3, period: { from: "2026-11-03", to: "2026-11-10" } };

describe("sumRows", () => {
  it("adds up every row; a field nobody filled stays not entered", () => {
    const sum = sumRows(
      table([
        ["Video", "1,200.10", "14", ""],
        ["Carousel", 640.2, "6", ""],
        ["Empty ad", "", "", ""],
      ]),
      mapping,
    );
    expect(sum).toEqual({
      totals: { spend: 1840.3, leads: 20, deals: null, new_customers: null, revenue: null },
      rowsSummed: 2,
      rowsSkipped: 1,
      errors: [],
    });
  });

  it("reports bad values with their line", () => {
    const sum = sumRows(table([["A", "-5", "1.5", ""], ["B", "10", "", ""]]), mapping);
    expect(sum.errors).toEqual([{ line: 2, reasons: ["הוצאה: יש להזין מספר שאינו שלילי", "לידים: יש להזין מספר שלם"] }]);
    expect(sum.totals.spend).toBe(10);
  });
});

describe("validateMapping for one campaign", () => {
  it("needs the dates and at least one value column, and ignores campaign and platform", () => {
    expect(validateMapping({ name: 0, platform: "meta_ads" }, 4, { campaign: true })).toEqual({
      ok: false,
      message: "יש לבחור: תאריכים, לפחות עמודת נתונים אחת",
    });
    const parsed = validateMapping({ name: 0, platform: "meta_ads", spend: 1, period: mapping.period }, 4, { campaign: true });
    expect(parsed).toEqual({ ok: true, value: { ...emptyMapping(), spend: 1, period: mapping.period } });
  });
});
