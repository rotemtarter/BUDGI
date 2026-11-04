import { describe, expect, it } from "vitest";
import { PERIOD_MESSAGES, emptyMapping, periodWeek, type ColumnMapping } from "@/lib/imports/fields";
import { suggestMapping, validateMapping } from "@/lib/imports/mapping";
import { buildPreview } from "@/lib/imports/preview";
import { validateRows, type ImportTable } from "@/lib/imports/rows";
import type { Cell } from "@/lib/imports/normalize";

const SAMPLE_HEADERS = ["שם קמפיין", "פלטפורמה", "תחילת שבוע", "הוצאה", "לידים", "עסקאות", "לקוחות חדשים", "הכנסות"];
const SAMPLE_MAPPING: ColumnMapping = {
  name: 0, platform: 1, week: 2, spend: 3, leads: 4, deals: 5, new_customers: 6, revenue: 7, period: null,
};

function table(rows: Cell[][]): ImportTable {
  return { headers: SAMPLE_HEADERS, rows: rows.map((cells, i) => ({ line: i + 2, cells })) };
}

describe("suggestMapping", () => {
  it("maps the sample headers automatically", () => {
    expect(suggestMapping(SAMPLE_HEADERS)).toEqual({ mapping: SAMPLE_MAPPING, auto: true });
  });

  it("ignores case, spaces, order and extra columns", () => {
    const { mapping, auto } = suggestMapping(["הערות", " תחילת  שבוע ", "פלטפורמה", "שם קמפיין"]);
    expect(auto).toBe(true);
    expect(mapping).toMatchObject({ name: 3, platform: 2, week: 1, spend: null });
  });

  it("recognizes common export names, so the import can be automatic", () => {
    const { mapping, auto } = suggestMapping(["Campaign", "פלטפורמה", "Week", "הוצאה"]);
    expect(auto).toBe(true);
    expect(mapping).toMatchObject({ name: 0, platform: 1, week: 2, spend: 3 });
  });

  it("fills in an ads export; only the platform and dates are left", () => {
    const headers = ["Campaign", "Spend_ILS", "Leads", "New_Customers", "Revenue_ILS", "Date"];
    const { mapping, auto } = suggestMapping(headers);
    expect(auto).toBe(false);
    expect(mapping).toMatchObject({
      name: 0, spend: 1, leads: 2, new_customers: 3, revenue: 4,
      // No deals column: not guessed from another one. A daily date is not a week.
      deals: null, platform: null, week: null,
    });
    expect(suggestMapping(["Ad name", "Amount spent (ILS)", "Reporting starts"]).mapping).toMatchObject({
      name: 0, spend: 1, week: 2,
    });
  });

  it("asks for a manual mapping when a required header is missing", () => {
    const { mapping, auto } = suggestMapping(["Notes", "פלטפורמה", "הוצאה"]);
    expect(auto).toBe(false);
    expect(mapping).toMatchObject({ name: null, platform: 1, week: null, spend: 2 });
  });
});

describe("periodWeek", () => {
  it("keeps a period inside one week in that week", () => {
    expect(periodWeek({ from: "2026-11-03", to: "2026-11-05" })).toBe("2026-11-01");
    expect(periodWeek({ from: "2026-11-01", to: "2026-11-07" })).toBe("2026-11-01");
  });

  it("moves a period across two weeks to the week with most days", () => {
    // 3–10.11: 5 days in 1–7.11, 3 days in 8–14.11
    expect(periodWeek({ from: "2026-11-03", to: "2026-11-10" })).toBe("2026-11-01");
    // 6–12.11: 2 days in 1–7.11, 5 days in 8–14.11
    expect(periodWeek({ from: "2026-11-06", to: "2026-11-12" })).toBe("2026-11-08");
    // 4–11.11: 4 and 4 → the earlier week
    expect(periodWeek({ from: "2026-11-04", to: "2026-11-11" })).toBe("2026-11-01");
  });
});

describe("validateMapping", () => {
  it("accepts columns, and leaves optional fields out", () => {
    expect(validateMapping({ name: 0, platform: 1, week: 2 }, 3)).toEqual({
      ok: true,
      value: { ...emptyMapping(), name: 0, platform: 1, week: 2 },
    });
  });

  it("accepts one platform and dates for the whole file", () => {
    const parsed = validateMapping({ name: 0, platform: "meta_ads", week: 2, period: { from: "2026-10-27", to: "2026-10-31" } }, 3);
    expect(parsed).toEqual({
      ok: true,
      value: { ...emptyMapping(), name: 0, platform: "meta_ads", week: null, period: { from: "2026-10-27", to: "2026-10-31" } },
    });
  });

  it("says what is missing", () => {
    expect(validateMapping({ name: 0 }, 3)).toEqual({ ok: false, message: "יש לבחור: פלטפורמה, תאריכים" });
  });

  it("rejects dates longer than 8 days unless a full month, in the wrong order, or unfinished", () => {
    const period = (from: string, to: string) => validateMapping({ name: 0, platform: "meta_ads", period: { from, to } }, 3);
    expect(period("2026-10-01", "2026-10-31").ok).toBe(true);
    expect(period("2026-02-01", "2026-02-28").ok).toBe(true);
    expect(period("2026-10-01", "2026-10-30")).toEqual({ ok: false, message: PERIOD_MESSAGES.tooLong });
    expect(period("2026-10-15", "2026-11-14")).toEqual({ ok: false, message: PERIOD_MESSAGES.tooLong });
    expect(period("2026-11-03", "2026-11-11")).toEqual({ ok: false, message: PERIOD_MESSAGES.tooLong });
    expect(period("2026-11-03", "2026-11-10").ok).toBe(true);
    expect(period("2026-10-30", "2026-10-27")).toEqual({ ok: false, message: PERIOD_MESSAGES.order });
    expect(period("2026-10-27", "")).toEqual({ ok: false, message: PERIOD_MESSAGES.missing });
  });

  it("rejects unknown columns and platforms", () => {
    expect(validateMapping({ name: 0, platform: 1, week: 3 }, 3).ok).toBe(false);
    expect(validateMapping({ name: 0, platform: "snapchat", week: 2 }, 3).ok).toBe(false);
    expect(validateMapping({ name: 0, platform: 1, week: "2" }, 3).ok).toBe(false);
    expect(validateMapping(null, 3).ok).toBe(false);
  });
});

describe("validateRows", () => {
  it("normalizes a valid row and keeps empty fields as null", () => {
    const { valid, errors, adjusted } = validateRows(
      table([[" Alpha ", "Facebook", "28/10/2026", "1,200", "20", "", null, "₪4,500"]]),
      SAMPLE_MAPPING,
    );
    expect(errors).toEqual([]);
    expect(valid).toEqual([
      {
        line: 2, key: "alpha|meta_ads", name: "Alpha", platform: "meta_ads", weekStart: "2026-10-25",
        spend: 1200, leads: 20, deals: null, new_customers: null, revenue: 4500,
      },
    ]);
    expect(adjusted).toEqual([{ line: 2, date: "2026-10-28", weekStart: "2026-10-25" }]);
  });

  it("reports every reason of a bad row with its line number", () => {
    const { valid, errors } = validateRows(
      table([
        ["", "", "", "", "", "", "", ""].map((v, i) => (i === 3 ? "5" : v)),
        ["A", "Snapchat", "31/02/2026", "-1", "2.5", "", "", ""],
        ["A", "Meta Ads", "25/10/2026", "", "", "", "", ""],
      ]),
      SAMPLE_MAPPING,
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual([
      { line: 2, reasons: ["חסר שם קמפיין", "חסרה פלטפורמה", "חסר תאריך תחילת שבוע"] },
      {
        line: 3,
        reasons: [
          "פלטפורמה לא מוכרת: Snapchat",
          "תאריך לא תקין (צריך להיות DD/MM/YYYY או YYYY-MM-DD)",
          "הוצאה: יש להזין מספר שאינו שלילי",
          "לידים: יש להזין מספר שלם",
        ],
      },
      { line: 4, reasons: ["אין בשורה אף ערך מספרי"] },
    ]);
  });

  it("marks every row of the same campaign and week as duplicates", () => {
    const { valid, errors, adjusted } = validateRows(
      table([
        ["Alpha", "Meta Ads", "26/10/2026", "100", "", "", "", ""],
        ["Beta", "Meta Ads", "26/10/2026", "100", "", "", "", ""],
        [" alpha", "Instagram", "31/10/2026", "200", "", "", "", ""],
        ["Alpha", "Google Ads", "26/10/2026", "100", "", "", "", ""],
      ]),
      SAMPLE_MAPPING,
    );
    expect(valid.map((r) => r.line)).toEqual([3, 5]);
    expect(errors).toEqual([
      { line: 2, reasons: ["כפולה: אותו קמפיין ואותו שבוע מופיעים גם בשורה 4"] },
      { line: 4, reasons: ["כפולה: אותו קמפיין ואותו שבוע מופיעים גם בשורה 2"] },
    ]);
    // Adjusted dates are listed only for rows that will be saved
    expect(adjusted.map((a) => a.line)).toEqual([3, 5]);
  });

  it("uses one platform and the dates of the whole file", () => {
    const mapping = { ...emptyMapping(), name: 0, platform: "tiktok_ads" as const, spend: 3, period: { from: "2026-10-28", to: "2026-10-30" } };
    const { valid, errors, adjusted } = validateRows(
      table([
        ["A", "whatever", "", "100", "", "", "", ""],
        ["B", "", "not a date", "50", "", "", "", ""],
        ["a ", "", "", "10", "", "", "", ""],
      ]),
      mapping,
    );
    expect(valid.map((r) => [r.name, r.platform, r.weekStart])).toEqual([["B", "tiktok_ads", "2026-10-25"]]);
    // Same campaign twice in one week
    expect(errors.map((e) => e.line)).toEqual([2, 4]);
    expect(adjusted).toEqual([]);
  });

  it("ignores columns that are not mapped", () => {
    const mapping = { ...emptyMapping(), name: 0, platform: 1, week: 2, leads: 4 };
    const { valid } = validateRows(table([["A", "TikTok", "2026-10-25", "oops", "7", "", "", ""]]), mapping);
    expect(valid[0]).toMatchObject({ spend: null, leads: 7 });
  });
});

describe("buildPreview", () => {
  const { valid } = validateRows(
    table([
      ["summer sale", "Meta Ads", "25/10/2026", "100", "", "", "", ""],
      ["Summer Sale", "Meta Ads", "01/11/2026", "100", "", "", "", ""],
      ["New One", "Google Ads", "25/10/2026", "100", "", "", "", ""],
      ["new one ", "Google Ads", "01/11/2026", "100", "", "", "", ""],
    ]),
    SAMPLE_MAPPING,
  );
  const existing = [{ id: "c1", name: "Summer Sale", platform: "meta_ads" as const }];

  it("sorts rows into new and updates, and lists campaigns to create once", () => {
    const plan = buildPreview(valid, existing, new Set(["c1|2026-10-25"]));
    expect(plan.newRows).toBe(3);
    expect(plan.updatedRows).toBe(1);
    expect(plan.newCampaigns).toEqual([{ name: "New One", platform: "google_ads" }]);
  });

  it("uses one name per campaign: the existing one, or the first in the file", () => {
    const plan = buildPreview(valid, existing, new Set());
    expect(plan.rows.map((r) => r.name)).toEqual(["Summer Sale", "Summer Sale", "New One", "New One"]);
    expect(plan.rows[0]).toEqual({
      name: "Summer Sale", platform: "meta_ads", week_start: "2026-10-25",
      spend: 100, leads: null, deals: null, new_customers: null, revenue: null,
    });
  });
});
