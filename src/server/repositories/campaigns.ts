import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isCampaignStatus, isPlatform, type CampaignStatus, type Platform } from "@/lib/campaigns/platforms";
import type { CreateCampaignValues, UpdateCampaignValues } from "@/lib/validation/campaigns";

export type Campaign = {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  description: string | null;
};

// Postgres error for the unique (user, name, platform) index
export const DUPLICATE_CAMPAIGN_CODE = "23505";

const COLUMNS = "id, name, platform, status, description";

function toCampaign(row: { id: string; name: string; platform: string; status: string; description: string | null }): Campaign {
  return {
    id: row.id,
    name: row.name,
    platform: isPlatform(row.platform) ? row.platform : "meta_ads",
    status: isCampaignStatus(row.status) ? row.status : "active",
    description: row.description,
  };
}

// All of the user's campaigns, newest first (RLS limits them to the user)
export async function listCampaigns(): Promise<Campaign[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toCampaign);
}

// null when the campaign does not exist or belongs to someone else
export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("campaigns").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toCampaign(data) : null;
}

// Creates an active campaign and, when given, its budget for `month`
export async function createCampaign(
  userId: string,
  values: CreateCampaignValues,
  month: string,
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      name: values.name,
      platform: values.platform,
      description: values.description,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (values.budget !== null) {
    try {
      await saveCampaignBudgetRow(supabase, userId, data.id, month, values.budget);
    } catch (budgetError) {
      // Do not leave a half-created campaign behind
      await supabase.from("campaigns").delete().eq("id", data.id);
      throw budgetError;
    }
  }
  return data.id;
}

export async function updateCampaign(id: string, values: UpdateCampaignValues) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("campaigns")
    .update({
      name: values.name,
      platform: values.platform,
      status: values.status,
      description: values.description,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function campaignHasWeeks(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("campaign_performance")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// The database also blocks deleting a campaign with weekly data (FK restrict)
export async function deleteCampaign(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function saveCampaignBudgetRow(
  supabase: ServerClient,
  userId: string,
  campaignId: string,
  month: string,
  amount: number | null,
) {
  const { error } = await supabase
    .from("campaign_budgets")
    .upsert(
      { user_id: userId, campaign_id: campaignId, month, planned_amount: amount },
      { onConflict: "campaign_id,month" },
    );
  if (error) throw error;
}

// Planned budget per campaign for the month, after copying active campaigns'
// budgets from the latest earlier month (PRD 4.2). Missing key = no row.
export async function getCampaignBudgets(month: string): Promise<Map<string, number | null>> {
  const supabase = await createSupabaseServerClient();
  const { error: copyError } = await supabase.rpc("ensure_month_defaults", { p_month: month });
  if (copyError) throw copyError;

  const { data, error } = await supabase
    .from("campaign_budgets")
    .select("campaign_id, planned_amount")
    .eq("month", month);
  if (error) throw error;
  return new Map(
    data.map((row) => [row.campaign_id, row.planned_amount === null ? null : Number(row.planned_amount)]),
  );
}

// Always writes the month's row; null keeps "no budget this month" (ADR-7)
export async function saveCampaignBudget(
  userId: string,
  campaignId: string,
  month: string,
  amount: number | null,
) {
  const supabase = await createSupabaseServerClient();
  await saveCampaignBudgetRow(supabase, userId, campaignId, month, amount);
}
