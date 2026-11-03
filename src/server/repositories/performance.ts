import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WeekValues } from "@/lib/validation/weeks";
import type { WeekRow } from "@/server/services/metrics";

export type WeekSource = "manual" | "import";
export type CampaignWeek = WeekRow & { source: WeekSource };

const FIELDS = "week_start, spend, leads, deals, new_customers, revenue";

function toNumber(value: number | null): number | null {
  return value === null ? null : Number(value);
}

function toWeekRow(row: WeekRow): WeekRow {
  return {
    week_start: row.week_start,
    spend: toNumber(row.spend),
    leads: toNumber(row.leads),
    deals: toNumber(row.deals),
    new_customers: toNumber(row.new_customers),
    revenue: toNumber(row.revenue),
  };
}

// One campaign's weeks, latest first (DESIGN.md 1.5)
export async function listWeeks(campaignId: string): Promise<CampaignWeek[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_performance")
    .select(`${FIELDS}, source`)
    .eq("campaign_id", campaignId)
    .order("week_start", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    ...toWeekRow(row),
    source: row.source === "import" ? "import" : "manual",
  }));
}

// Weeks of all the user's campaigns that start between `from` and `to`
export async function listWeeksInRange(from: string, to: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_performance")
    .select(`campaign_id, ${FIELDS}`)
    .gte("week_start", from)
    .lte("week_start", to);
  if (error) throw error;
  return data.map((row) => ({ campaignId: row.campaign_id, ...toWeekRow(row) }));
}

// Creates or replaces the campaign's row for that week. A manual save writes
// all five fields, so an emptied field becomes "not entered" (null).
export async function upsertWeek(userId: string, campaignId: string, values: WeekValues) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("campaign_performance").upsert(
    {
      user_id: userId,
      campaign_id: campaignId,
      week_start: values.date,
      spend: values.spend,
      leads: values.leads,
      deals: values.deals,
      new_customers: values.new_customers,
      revenue: values.revenue,
      source: "manual",
    },
    { onConflict: "campaign_id,week_start" },
  );
  if (error) throw error;
}

export async function deleteWeek(campaignId: string, weekStart: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("campaign_performance")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("week_start", weekStart);
  if (error) throw error;
}

// Sunday of the user's earliest week with data, or null
export async function getFirstWeekStart(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaign_performance")
    .select("week_start")
    .order("week_start", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.week_start ?? null;
}
