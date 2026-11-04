import "server-only";
import {
  emptyMapping,
  isFullMonth,
  monthWeeks,
  periodCrossesWeeks,
  periodWeek,
  splitMonth,
  VALUE_FIELDS,
  type ColumnMapping,
} from "@/lib/imports/fields";
import { suggestMapping, validateMapping } from "@/lib/imports/mapping";
import { campaignKey, cellText } from "@/lib/imports/normalize";
import { buildPreview, type ImportPlan } from "@/lib/imports/preview";
import { validateRows, type ImportTable, type ValidatedRows } from "@/lib/imports/rows";
import type { CommitResult, FileColumns, PreviewResponse } from "@/lib/imports/types";
import { getCampaign, listCampaigns, type Campaign } from "@/server/repositories/campaigns";
import { sumRows } from "@/lib/imports/campaign";
import { findExistingWeeks, findWeekValues, recordFailedImport, saveImport } from "@/server/repositories/imports";
import { readImportFile, type UploadedFile } from "@/server/import/parse-file";

// Import Service (ARCHITECTURE.md 2.2, 5.2). Stateless: the browser sends the
// file again for every step, and commit checks everything again.

export class ImportInputError extends Error {}

export const MAPPING_MESSAGE = "יש לבחור עמודה לכל שדה חובה";
export const NOTHING_TO_IMPORT_MESSAGE = "אין שורות תקינות לייבוא";

function columnsOf(table: ImportTable, mapping: ColumnMapping): FileColumns {
  const first = table.rows[0]?.cells ?? [];
  return { headers: table.headers, samples: table.headers.map((_, i) => cellText(first[i] ?? null)), mapping };
}

async function planImport(table: ImportTable, mapping: ColumnMapping): Promise<ValidatedRows & { plan: ImportPlan }> {
  const checked = validateRows(table, mapping);
  const campaigns = await listCampaigns();

  const keys = new Set(checked.valid.map((r) => r.key));
  const matched = campaigns.filter((c) => keys.has(campaignKey(c.name, c.platform)));
  const weeks = checked.valid.map((r) => r.weekStart).sort();
  const existingWeeks = weeks.length
    ? await findExistingWeeks(matched.map((c) => c.id), weeks[0], weeks[weeks.length - 1])
    : new Set<string>();

  return { ...checked, plan: buildPreview(checked.valid, campaigns, existingWeeks) };
}

function resolveMapping(table: ImportTable, input: unknown, campaign = false): ColumnMapping {
  const parsed = validateMapping(input, table.headers.length, { campaign });
  if (!parsed.ok) throw new ImportInputError(parsed.message);
  return parsed.value;
}

// Without a mapping: suggest one, and go straight to the review when the
// headers match the sample file. With a mapping: the review.
export async function previewImport(file: UploadedFile, mappingInput?: unknown): Promise<PreviewResponse> {
  const table = readImportFile(file);

  let mapping: ColumnMapping;
  let autoMapped = false;
  if (mappingInput === undefined) {
    const suggested = suggestMapping(table.headers);
    if (!suggested.auto) return { ok: true, stage: "mapping", ...columnsOf(table, suggested.mapping) };
    mapping = suggested.mapping;
    autoMapped = true;
  } else {
    mapping = resolveMapping(table, mappingInput);
  }

  const { errors, adjusted, combinedRows, daily, plan } = await planImport(table, mapping);
  return {
    ok: true,
    stage: "review",
    autoMapped,
    ...columnsOf(table, mapping),
    summary: {
      rowsTotal: table.rows.length,
      newRows: plan.newRows,
      updatedRows: plan.updatedRows,
      newCampaigns: plan.newCampaigns,
      errors,
      adjusted,
      monthWeeks: mapping.period && isFullMonth(mapping.period) ? monthWeeks(mapping.period).length : null,
      combinedRows,
      daily,
    },
  };
}

// Saves the valid rows after the user confirmed (one transaction)
export async function commitImport(file: UploadedFile, mappingInput: unknown): Promise<CommitResult> {
  const table = readImportFile(file);
  const mapping = resolveMapping(table, mappingInput);
  const { errors, plan } = await planImport(table, mapping);
  if (plan.rows.length === 0) throw new ImportInputError(NOTHING_TO_IMPORT_MESSAGE);

  try {
    const saved = await saveImport({ fileName: file.name, rows: plan.rows, rowsTotal: table.rows.length, errors });
    return {
      rowsImported: saved.rowsInserted + saved.rowsUpdated,
      rowsInserted: saved.rowsInserted,
      rowsUpdated: saved.rowsUpdated,
      rowsRejected: errors.length,
      campaignsCreated: saved.campaignsCreated,
    };
  } catch (error) {
    await recordFailedImport(file.name, table.rows.length);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Import into one campaign (from its details screen): the rows of the file,
// for example one per ad, are added up into the campaign's week for the
// typed dates. A stored week is updated; an empty field keeps its value.
// ---------------------------------------------------------------------------

export const CAMPAIGN_NOT_FOUND_MESSAGE = "הקמפיין לא נמצא";
export const CAMPAIGN_ROW_ERRORS_MESSAGE = "יש בקובץ שורות עם שגיאות. יש לתקן אותן ולהעלות את הקובץ שוב.";

async function requireCampaign(campaignId: string): Promise<Campaign> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new ImportInputError(CAMPAIGN_NOT_FOUND_MESSAGE);
  return campaign;
}

async function sumForCampaign(table: ImportTable, campaign: Campaign, mappingInput: unknown) {
  const mapping = resolveMapping(table, mappingInput, true);
  const sum = sumRows(table, mapping);
  const period = mapping.period!;
  // A full month: the totals are split into the month's weeks (ADR-16)
  if (isFullMonth(period)) {
    const weeks = monthWeeks(period);
    const stored = await findExistingWeeks([campaign.id], weeks[0], weeks[weeks.length - 1]);
    const rows = splitMonth(period, sum.totals);
    return {
      mapping,
      sum,
      weekStart: weeks[0],
      crossesWeeks: false,
      existing: null,
      month: { weeks, existingWeeks: stored.size },
      rows,
    };
  }
  const weekStart = periodWeek(period);
  return {
    mapping,
    sum,
    weekStart,
    crossesWeeks: periodCrossesWeeks(period),
    existing: await findWeekValues(campaign.id, weekStart),
    month: null,
    rows: [{ weekStart, ...sum.totals }],
  };
}

export async function previewCampaignImport(
  file: UploadedFile,
  campaignId: string,
  mappingInput?: unknown,
): Promise<PreviewResponse> {
  const campaign = await requireCampaign(campaignId);
  const table = readImportFile(file);

  if (mappingInput === undefined) {
    // Value columns named like the sample file are chosen in advance
    const suggested = suggestMapping(table.headers).mapping;
    const mapping = emptyMapping();
    for (const field of VALUE_FIELDS) mapping[field] = suggested[field];
    return { ok: true, stage: "mapping", ...columnsOf(table, mapping) };
  }

  const { mapping, sum, weekStart, crossesWeeks, existing, month } = await sumForCampaign(table, campaign, mappingInput);
  return {
    ok: true,
    stage: "campaign-review",
    ...columnsOf(table, mapping),
    summary: { weekStart, crossesWeeks, existing, month, ...sum },
  };
}

export async function commitCampaignImport(file: UploadedFile, campaignId: string, mappingInput: unknown): Promise<CommitResult> {
  const campaign = await requireCampaign(campaignId);
  const table = readImportFile(file);
  const { sum, rows: weeks } = await sumForCampaign(table, campaign, mappingInput);
  if (sum.errors.length > 0) throw new ImportInputError(CAMPAIGN_ROW_ERRORS_MESSAGE);
  if (sum.rowsSummed === 0) throw new ImportInputError(NOTHING_TO_IMPORT_MESSAGE);

  const rows = weeks.map(({ weekStart, ...values }) => ({
    name: campaign.name,
    platform: campaign.platform,
    week_start: weekStart,
    ...values,
  }));
  try {
    const saved = await saveImport({ fileName: file.name, rows, rowsTotal: table.rows.length, errors: [] });
    return {
      rowsImported: saved.rowsInserted + saved.rowsUpdated,
      rowsInserted: saved.rowsInserted,
      rowsUpdated: saved.rowsUpdated,
      rowsRejected: 0,
      campaignsCreated: 0,
    };
  } catch (error) {
    await recordFailedImport(file.name, table.rows.length);
    throw error;
  }
}
