import { describe, expect, it } from "vitest";
import type { Campaign } from "@/server/repositories/campaigns";
import type { WeekRow } from "@/server/services/metrics";
import { periodSummary } from "@/server/services/metrics";
import { buildAdvisorContext, type ContextInput } from "@/server/services/advisor-context";

// Known data for the Advisor's context (ARCHITECTURE.md 5.6, 6.4). Calendar
// 2026: 1 November is a Sunday; "now" is 15 November in Israel.
const NOW = new Date("2026-11-15T10:00:00Z");
const NOV = { kind: "month", month: "2026-11-01" } as const;

function week(week_start: string, values: Partial<Omit<WeekRow, "week_start">>): WeekRow {
  return { week_start, spend: null, leads: null, deals: null, new_customers: null, revenue: null, ...values };
}

const campaign = (id: string, status: Campaign["status"] = "active"): Campaign => ({
  id,
  name: `Campaign ${id}`,
  platform: "meta_ads",
  status,
  description: "private notes",
});

const c1 = [week("2026-11-01", { spend: 1000, leads: 10, revenue: 3000 }), week("2026-11-08", { spend: 1000, leads: 10, revenue: 3000 })];
const c2 = [week("2026-11-01", { spend: 500 })];
const c4 = [week("2026-10-04", { spend: 800, leads: 4 })];

function input(overrides: Partial<ContextInput> = {}): ContextInput {
  const rowsByCampaign = new Map([
    ["c1", c1],
    ["c2", c2],
    ["c4", c4],
  ]);
  return {
    now: NOW,
    hasAnyData: true,
    rows: [...c1, ...c2, ...c4],
    rowsByCampaign,
    campaigns: [campaign("c1"), campaign("c2", "paused"), campaign("c3", "ended"), campaign("c4", "ended")],
    budget: 10000,
    campaignBudgets: new Map<string, number | null>([
      ["c1", 4000],
      ["c2", 2000],
    ]),
    goals: { revenue: 20000, deals: null, leads: 50, min_roas: 2 },
    alerts: [
      { type: "budget_overrun", title: "חריגה", description: "ההוצאה עברה את התקציב", month: "2026-11-01", campaignId: "c1" },
      { type: "spend_pace", title: "קצב", description: "ישן", month: "2026-10-01", campaignId: null },
    ],
    ...overrides,
  };
}

describe("advisor context", () => {
  const context = buildAdvisorContext(input());

  it("dates the context in Israel time", () => {
    expect(context.today).toBe("2026-11-15");
    expect(context.month).toBe("2026-11-01");
    expect(context.days_left_in_month).toBe(15);
  });

  it("uses the Metrics Service results for the business", () => {
    const expected = periodSummary([...c1, ...c2, ...c4], NOV);
    expect(context.business.this_month.spend).toBe(expected.spend);
    expect(context.business.this_month.spend).toBe(2500);
    expect(context.business.this_month.leads).toBe(20);
    // CPL only from rows with both spend and leads: 2000 ÷ 20
    expect(context.business.this_month.cpl).toBe(100);
    expect(context.business.this_month.roas).toBe(3);
    expect(context.business.remaining_budget).toBe(7500);
    expect(context.business.allocated_to_campaigns).toBe(6000);
    expect(context.business.unallocated_budget).toBe(4000);
    expect(context.business.goals).toEqual({ revenue: 20000, deals: null, leads: 50, min_roas: 2 });
  });

  it("keeps missing values as null and says why a ratio is not available", () => {
    expect(context.business.this_month.deals).toBeNull();
    expect(context.business.this_month.cost_per_deal).toEqual({ not_available: expect.any(String) });
    const c2Context = context.campaigns.find((c) => c.id === "c2")!;
    expect(c2Context.this_month.leads).toBeNull();
    expect(c2Context.this_month.cpl).toEqual({ not_available: expect.any(String) });
  });

  it("includes the month's forecast with its basis", () => {
    expect(context.forecast.covered_days).toBe(14);
    expect(context.forecast.enough_data).toBe(true);
    expect(context.forecast.spend.forecast).not.toBeNull();
    expect(context.forecast.spend.basis).toBe("pace");
    expect(context.forecast.expected_goal_progress_percent.deals).toBeNull();
  });

  it("includes active campaigns and campaigns with a budget or recent data only", () => {
    expect(context.campaigns.map((c) => c.id)).toEqual(["c1", "c2", "c4"]);
    const c1Context = context.campaigns.find((c) => c.id === "c1")!;
    expect(c1Context.monthly_budget).toBe(4000);
    expect(c1Context.remaining_budget).toBe(2000);
    expect(context.campaigns.find((c) => c.id === "c4")!.previous_month.spend).toBe(800);
  });

  it("keeps only this month's alerts", () => {
    expect(context.alerts_this_month).toEqual([
      { type: "budget_overrun", title: "חריגה", description: "ההוצאה עברה את התקציב", campaign_id: "c1" },
    ]);
  });

  it("sends no personal details or campaign descriptions", () => {
    const json = JSON.stringify(context);
    expect(json).not.toContain("private notes");
    for (const key of ["email", "display_name", "business_name", "user_id"]) expect(json).not.toContain(key);
  });

  it("sends at most 50 campaigns, the ones with the most spend first", () => {
    const many = Array.from({ length: 60 }, (_, i) => campaign(`m${i}`));
    const rowsByCampaign = new Map(many.map((c, i) => [c.id, [week("2026-11-01", { spend: i + 1 })]]));
    const big = buildAdvisorContext(
      input({ campaigns: many, rowsByCampaign, rows: [...rowsByCampaign.values()].flat(), campaignBudgets: new Map() }),
    );
    expect(big.campaigns).toHaveLength(50);
    expect(big.campaigns_not_included).toBe(10);
    expect(big.campaigns[0].id).toBe("m59");
    expect(big.campaigns.map((c) => c.id)).not.toContain("m0");
    expect(context.campaigns_not_included).toBe(0);
  });

  it("marks an account without data", () => {
    const empty = buildAdvisorContext(
      input({ hasAnyData: false, rows: [], rowsByCampaign: new Map(), campaigns: [], campaignBudgets: new Map(), alerts: [] }),
    );
    expect(empty.has_any_data).toBe(false);
    expect(empty.business.this_month.spend).toBeNull();
    expect(empty.forecast.enough_data).toBe(false);
    expect(empty.campaigns).toEqual([]);
  });
});
