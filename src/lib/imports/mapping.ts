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

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

// Matches file headers to the sample-file headers. `auto` is true when the
// campaign, platform and week columns were all found, so the mapping step can
// be skipped (DESIGN.md 1.11).
export function suggestMapping(headers: string[]): { mapping: ColumnMapping; auto: boolean } {
  const mapping = emptyMapping();
  const normalized = headers.map(normalizeHeader);
  for (const field of IMPORT_FIELDS) {
    const index = normalized.indexOf(normalizeHeader(field.header));
    if (index !== -1) mapping[field.key] = index;
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
