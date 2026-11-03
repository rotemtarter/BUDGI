import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CommitRow } from "@/lib/imports/preview";
import type { RowError } from "@/lib/imports/rows";
import type { WeekValues } from "@/lib/imports/campaign";

// Row-level reasons kept in import_jobs (numbers and reasons only)
const MAX_SAVED_ERRORS = 100;

function errorSummary(errors: RowError[]) {
  return errors.slice(0, MAX_SAVED_ERRORS).map((e) => ({ row: e.line, reason: e.reasons.join("; ") }));
}

function safeFileName(name: string) {
  return (name.trim() || "file").slice(0, 255);
}

// "campaignId|weekStart" of the existing weeks of these campaigns in the range
export async function findExistingWeeks(campaignIds: string[], from: string, to: string): Promise<Set<string>> {
  if (campaignIds.length === 0) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_performance")
    .select("campaign_id, week_start")
    .in("campaign_id", campaignIds)
    .gte("week_start", from)
    .lte("week_start", to);
  if (error) throw error;
  return new Set(data.map((row) => `${row.campaign_id}|${row.week_start}`));
}

// One campaign week's stored values, or null when the week has no row
export async function findWeekValues(campaignId: string, weekStart: string): Promise<WeekValues | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_performance")
    .select("spend, leads, deals, new_customers, revenue")
    .eq("campaign_id", campaignId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const num = (value: number | null) => (value === null ? null : Number(value));
  return {
    spend: num(data.spend),
    leads: num(data.leads),
    deals: num(data.deals),
    new_customers: num(data.new_customers),
    revenue: num(data.revenue),
  };
}

export type SavedImport = {
  rowsInserted: number;
  rowsUpdated: number;
  campaignsCreated: number;
};

// Creates the missing campaigns, upserts the weeks and records the job in one
// transaction (commit_import, ARCHITECTURE.md 5.2)
export async function saveImport(input: {
  fileName: string;
  rows: CommitRow[];
  rowsTotal: number;
  errors: RowError[];
}): Promise<SavedImport> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("commit_import", {
    p_file_name: safeFileName(input.fileName),
    p_rows: input.rows,
    p_rows_total: input.rowsTotal,
    p_rows_rejected: input.errors.length,
    p_errors: errorSummary(input.errors),
  });
  if (error) throw error;
  const result = data as { rows_inserted: number; rows_updated: number; campaigns_created: number };
  return {
    rowsInserted: result.rows_inserted,
    rowsUpdated: result.rows_updated,
    campaignsCreated: result.campaigns_created,
  };
}

// Best effort: an import that failed is still counted (ARCHITECTURE.md 8.2)
export async function recordFailedImport(fileName: string, rowsTotal: number) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("import_jobs").insert({
      file_name: safeFileName(fileName),
      status: "failed",
      rows_total: rowsTotal,
      completed_at: new Date().toISOString(),
    });
  } catch {
    // Never hide the original error
  }
}
