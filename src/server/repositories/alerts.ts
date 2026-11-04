import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlatform, type Platform } from "@/lib/campaigns/platforms";
import {
  ALERT_SEVERITY,
  ALERT_TYPES,
  DEFAULT_ALERT_SETTINGS,
  isAlertType,
  type AlertSettings,
  type AlertSeverity,
  type AlertType,
} from "@/lib/alerts/types";
import { fromThresholdConfig, toThresholdConfig } from "@/lib/validation/alert-settings";

// The user's thresholds; a type without a stored row uses the defaults (PRD 4.6)
export async function getAlertSettings(): Promise<AlertSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("alert_settings").select("alert_type, enabled, threshold_config");
  if (error) throw error;

  const settings = structuredClone(DEFAULT_ALERT_SETTINGS);
  for (const row of data) {
    if (isAlertType(row.alert_type)) {
      settings[row.alert_type] = fromThresholdConfig(row.alert_type, row.enabled, row.threshold_config);
    }
  }
  return settings;
}

// Writes all five rows
export async function saveAlertSettings(userId: string, settings: AlertSettings) {
  const supabase = await createSupabaseServerClient();
  const rows = ALERT_TYPES.map((type) => ({
    user_id: userId,
    alert_type: type,
    enabled: settings[type].enabled,
    threshold_config: toThresholdConfig(type, settings[type]),
  }));
  const { error } = await supabase.from("alert_settings").upsert(rows, { onConflict: "user_id,alert_type" });
  if (error) throw error;
}

export type StoredAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  month: string;
  createdAt: string;
  readAt: string | null;
  campaign: { id: string; name: string; platform: Platform } | null;
};

const COLUMNS =
  "id, alert_type, severity, title, description, month, created_at, read_at, related_campaign_id, campaigns(name, platform)";

type AlertRow = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  month: string;
  created_at: string;
  read_at: string | null;
  related_campaign_id: string | null;
  campaigns: { name: string; platform: string } | null;
};

function toAlert(row: AlertRow): StoredAlert {
  const type = isAlertType(row.alert_type) ? row.alert_type : "spend_pace";
  const severity = (["info", "warning", "critical"] as const).find((s) => s === row.severity) ?? ALERT_SEVERITY[type];
  return {
    id: row.id,
    type,
    severity,
    title: row.title,
    description: row.description,
    month: row.month,
    createdAt: row.created_at,
    readAt: row.read_at,
    campaign:
      row.related_campaign_id && row.campaigns
        ? {
            id: row.related_campaign_id,
            name: row.campaigns.name,
            platform: isPlatform(row.campaigns.platform) ? row.campaigns.platform : "meta_ads",
          }
        : null,
  };
}

// Alert center (DESIGN.md 1.9), newest first
// `limit`: only the newest ones (the home screen, DESIGN.md 1.3)
export async function listAlerts({ unreadOnly = false, limit }: { unreadOnly?: boolean; limit?: number } = {}): Promise<StoredAlert[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("alerts").select(COLUMNS).order("created_at", { ascending: false });
  if (unreadOnly) query = query.is("read_at", null);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toAlert);
}

export async function getAlert(id: string): Promise<StoredAlert | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("alerts").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toAlert(data) : null;
}

export async function countUnreadAlerts(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAlertRead(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export type PreviousAlert = { dedupeKey: string; deviation: number; createdAt: string };

// Earlier alerts with these keys, for the duplicate check (ARCHITECTURE.md 5.5).
// Keys include the month, so this is at most the current month's alerts.
export async function findAlertsByKeys(keys: string[]): Promise<PreviousAlert[]> {
  if (keys.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("dedupe_key, deviation, created_at")
    .in("dedupe_key", keys);
  if (error) throw error;
  return data.map((row) => ({
    dedupeKey: row.dedupe_key,
    deviation: Number(row.deviation),
    createdAt: row.created_at,
  }));
}

export type AlertToInsert = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  campaignId: string | null;
  month: string;
  dedupeKey: string;
  deviation: number;
};

export async function insertAlerts(userId: string, alerts: AlertToInsert[]): Promise<{ id: string }[]> {
  if (alerts.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("alerts")
    .insert(
      alerts.map((alert) => ({
        user_id: userId,
        alert_type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        related_campaign_id: alert.campaignId,
        month: alert.month,
        dedupe_key: alert.dedupeKey,
        deviation: alert.deviation,
      })),
    )
    .select("id");
  if (error) throw error;
  return data;
}
