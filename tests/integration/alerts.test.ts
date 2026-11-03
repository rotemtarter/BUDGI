import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_ALERT_SETTINGS } from "@/lib/alerts/types";
import { toThresholdConfig } from "@/lib/validation/alert-settings";
import { selectNewAlerts, type AlertCandidate } from "@/server/services/alerts";
import { resetTestUser, signInTestUser } from "../support/test-users";

// Alert settings and alerts in budgi-dev, as test user B. The reads and writes
// match src/server/repositories/alerts.ts.
let b: { client: SupabaseClient<Database>; userId: string };

beforeAll(async () => {
  b = await signInTestUser("B");
});

beforeEach(async () => {
  await resetTestUser(b.client, b.userId);
});

afterAll(async () => {
  await resetTestUser(b.client, b.userId);
});

const MONTH = "2030-11-01";

function candidate(deviation: number, campaignId: string | null = null): AlertCandidate {
  return {
    type: "budget_overrun",
    severity: "critical",
    campaignId,
    month: MONTH,
    dedupeKey: `budget_overrun:${campaignId ?? "business"}:${MONTH}`,
    deviation,
    step: 10,
    title: "חריגה מהתקציב",
    description: `ההוצאה בפועל החודש עברה את התקציב ב-${deviation}%.`,
  };
}

async function insert(alerts: AlertCandidate[]) {
  const { data, error } = await b.client
    .from("alerts")
    .insert(
      alerts.map((a) => ({
        user_id: b.userId,
        alert_type: a.type,
        severity: a.severity,
        title: a.title,
        description: a.description,
        related_campaign_id: a.campaignId,
        month: a.month,
        dedupe_key: a.dedupeKey,
        deviation: a.deviation,
      })),
    )
    .select("id");
  if (error) throw error;
  return data;
}

async function earlier(keys: string[]) {
  const { data, error } = await b.client.from("alerts").select("dedupe_key, deviation, created_at").in("dedupe_key", keys);
  if (error) throw error;
  return data.map((row) => ({ dedupeKey: row.dedupe_key, deviation: Number(row.deviation), createdAt: row.created_at }));
}

describe("alert settings", () => {
  it("saves one row per type and updates it on the next save", async () => {
    const rows = (enabled: boolean, percent: number) =>
      (["spend_pace", "performance_drop"] as const).map((type) => ({
        user_id: b.userId,
        alert_type: type,
        enabled,
        threshold_config: toThresholdConfig(type, { ...DEFAULT_ALERT_SETTINGS[type], percent }),
      }));
    for (const values of [rows(true, 10), rows(false, 30)]) {
      const { error } = await b.client.from("alert_settings").upsert(values, { onConflict: "user_id,alert_type" });
      expect(error).toBeNull();
    }
    const { data } = await b.client.from("alert_settings").select("alert_type, enabled, threshold_config").order("alert_type");
    expect(data).toEqual([
      { alert_type: "performance_drop", enabled: false, threshold_config: { percent: 30, weeks: 4 } },
      { alert_type: "spend_pace", enabled: false, threshold_config: { percent: 30 } },
    ]);
  });

  it("rejects an unknown type", async () => {
    const { error } = await b.client.from("alert_settings").insert({ alert_type: "missing_data" });
    expect(error?.code).toBe("23514");
  });
});

describe("alerts", () => {
  it("does not create the same alert twice in a week, unless it grew by the step", async () => {
    const first = candidate(5);
    expect(selectNewAlerts([first], await earlier([first.dedupeKey]))).toHaveLength(1);
    await insert([first]);

    // Saved again: same deviation, then +9 → nothing new
    expect(selectNewAlerts([candidate(5)], await earlier([first.dedupeKey]))).toHaveLength(0);
    expect(selectNewAlerts([candidate(14)], await earlier([first.dedupeKey]))).toHaveLength(0);
    // +10 → a new alert
    const grown = selectNewAlerts([candidate(15)], await earlier([first.dedupeKey]));
    expect(grown).toHaveLength(1);
    await insert(grown);

    const { count } = await b.client.from("alerts").select("id", { count: "exact", head: true });
    expect(count).toBe(2);
  });

  it("lists newest first with the campaign, counts unread and marks as read", async () => {
    const campaign = await b.client.from("campaigns").insert({ name: "B alerts", platform: "tiktok_ads" }).select("id").single();
    if (campaign.error) throw campaign.error;
    const [business] = await insert([candidate(5)]);
    await insert([candidate(40, campaign.data.id)]);

    const list = await b.client
      .from("alerts")
      .select("id, related_campaign_id, campaigns(name, platform)")
      .order("created_at", { ascending: false });
    expect(list.error).toBeNull();
    expect(list.data?.[0].campaigns).toEqual({ name: "B alerts", platform: "tiktok_ads" });
    expect(list.data?.[1].campaigns).toBeNull();

    const unread = async () =>
      (await b.client.from("alerts").select("id", { count: "exact", head: true }).is("read_at", null)).count;
    expect(await unread()).toBe(2);
    const read = await b.client.from("alerts").update({ read_at: new Date().toISOString() }).eq("id", business.id).is("read_at", null);
    expect(read.error).toBeNull();
    expect(await unread()).toBe(1);
  });

  it("removes a campaign's alerts with the campaign", async () => {
    const campaign = await b.client.from("campaigns").insert({ name: "B gone", platform: "meta_ads" }).select("id").single();
    if (campaign.error) throw campaign.error;
    await insert([candidate(5, campaign.data.id)]);
    const removed = await b.client.from("campaigns").delete().eq("id", campaign.data.id);
    expect(removed.error).toBeNull();
    expect((await b.client.from("alerts").select("id")).data).toEqual([]);
  });

  it("checks severity and month", async () => {
    const bad = await b.client.from("alerts").insert({
      alert_type: "spend_pace",
      severity: "urgent",
      title: "x",
      description: "x",
      month: "2030-11-02",
      dedupe_key: "x",
    });
    expect(bad.error?.code).toBe("23514");
  });
});
