import type { Parsed } from "./normalize";
import {
  IMPORT_FIELDS,
  VALUE_FIELDS,
  emptyMapping,
  isPlatformValue,
  missingCampaignMapping,
  missingMapping,
  type ColumnMapping,
} from "./fields";

// Lower case, without currency marks ("(ILS)", "₪", "_ils") and with "_" / "-"
// as spaces: "Amount spent (ILS)" → "amount spent", "Spend_ILS" → "spend"
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[₪$]/g, " ")
    .replace(/\((ils|nis|usd|₪)\)/g, " ")
    .replace(/[_\-./]+/g, " ")
    .replace(/\b(ils|nis|usd)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common column names in ad-platform exports and spreadsheets, in English and
// Hebrew (normalized). The Budgi sample-file header is always one of them.
const HEADER_NAMES: Record<(typeof IMPORT_FIELDS)[number]["key"], string[]> = {
  name: ["campaign", "campaign name", "campaigns", "ad name", "ad set name", "קמפיין", "שם הקמפיין"],
  platform: ["platform", "channel", "network", "פלטפורמה", "ערוץ"],
  // Week columns only: a daily "date" column would put several rows in one
  // week, so dates are left to choose
  week: ["week", "week start", "week starting", "week of", "reporting starts", "שבוע", "תחילת השבוע"],
  spend: ["spend", "amount spent", "cost", "costs", "total spend", "ad spend", "הוצאות", "עלות", "סכום שהוצא"],
  leads: ["leads", "lead", "ליד"],
  deals: ["deals", "deal", "sales", "purchases", "conversions", "orders", "מכירות", "המרות", "עסקה"],
  new_customers: ["new customers", "new customer", "customers", "לקוחות", "לקוח חדש"],
  revenue: [
    "revenue", "income", "purchase value", "purchases conversion value", "conversion value", "conv value",
    "total revenue", "sales value", "הכנסה", "הכנסות", "שווי המרות",
  ],
};

// Matches file headers to Budgi fields by the sample-file headers and common
// export names; each column is used once. `auto` is true when the campaign,
// platform and week columns were all found, so the mapping step can be
// skipped (DESIGN.md 1.11). Otherwise the mapping step opens filled in, and
// usually only the platform (and dates) are left to choose.
export function suggestMapping(headers: string[]): { mapping: ColumnMapping; auto: boolean } {
  const mapping = emptyMapping();
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS) {
    const names = [normalizeHeader(field.header), ...HEADER_NAMES[field.key]];
    const index = normalized.findIndex((header, i) => !used.has(i) && names.includes(header));
    if (index === -1) continue;
    mapping[field.key] = index;
    used.add(index);
  }
  return { mapping, auto: mapping.name !== null && mapping.platform !== null && mapping.week !== null };
}

const MAPPING_MESSAGE = "יש לבחור עמודה לכל שדה חובה";

// A mapping sent by the browser: existing columns only, a known platform,
// a usable period, and every required field chosen. For an import into one
// campaign, only the value columns and the period count.
export function validateMapping(
  input: unknown,
  columnCount: number,
  { campaign = false }: { campaign?: boolean } = {},
): Parsed<ColumnMapping> {
  if (typeof input !== "object" || input === null) return { ok: false, message: MAPPING_MESSAGE };
  const raw = input as Record<string, unknown>;
  const isColumn = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value < columnCount;
  const mapping = emptyMapping();

  for (const key of ["name", "week", ...VALUE_FIELDS] as const) {
    const value = raw[key];
    if (value === null || value === undefined) continue;
    if (!isColumn(value)) return { ok: false, message: MAPPING_MESSAGE };
    mapping[key] = value;
  }

  if (raw.platform !== null && raw.platform !== undefined) {
    if (!isColumn(raw.platform) && !isPlatformValue(raw.platform)) return { ok: false, message: MAPPING_MESSAGE };
    mapping.platform = raw.platform;
  }

  if (raw.period !== null && raw.period !== undefined) {
    const period = raw.period as Record<string, unknown>;
    if (typeof period !== "object" || typeof period.from !== "string" || typeof period.to !== "string") {
      return { ok: false, message: MAPPING_MESSAGE };
    }
    // Dates typed for the whole file replace any date column
    mapping.period = { from: period.from, to: period.to };
    mapping.week = null;
  }

  if (campaign) {
    const forCampaign = { ...emptyMapping(), period: mapping.period };
    for (const key of VALUE_FIELDS) forCampaign[key] = mapping[key];
    const missing = missingCampaignMapping(forCampaign);
    return missing ? { ok: false, message: missing } : { ok: true, value: forCampaign };
  }

  const missing = missingMapping(mapping);
  return missing ? { ok: false, message: missing } : { ok: true, value: mapping };
}
