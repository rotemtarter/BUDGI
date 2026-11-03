import { describe, expect, it } from "vitest";
import { DEFAULT_ALERT_SETTINGS, type AlertSettings, type AlertType } from "@/lib/alerts/types";
import { alertHref } from "@/lib/alerts/links";
import { formatAlertTime } from "@/lib/alerts/format";
import {
  alertRowsFrom,
  evaluateAlerts,
  selectNewAlerts,
  type AlertCandidate,
  type AlertInput,
  type CampaignWeekRow,
} from "@/server/services/alerts";

// November 2026: the 1st is a Sunday, 30 days. No data before October, so
// every forecast is by pace only.
const MONTH = "2026-11-01";
const TODAY = "2026-11-14";

function week(campaignId: string, week_start: string, values: Partial<CampaignWeekRow> = {}): CampaignWeekRow {
  return { campaignId, week_start, spend: null, leads: null, deals: null, new_customers: null, revenue: null, ...values };
}

function input(overrides: Partial<AlertInput> = {}): AlertInput {
  return {
    month: MONTH,
    today: TODAY,
    rows: [],
    campaigns: [{ id: "c1", name: "קמפיין א" }],
    budget: null,
    campaignBudgets: new Map(),
    goals: { revenue: null, deals: null, leads: null, min_roas: null },
    ...overrides,
  };
}

function settings(change: Partial<Record<AlertType, Partial<AlertSettings[AlertType]>>> = {}): AlertSettings {
  const result = structuredClone(DEFAULT_ALERT_SETTINGS);
  for (const [type, value] of Object.entries(change)) Object.assign(result[type as AlertType], value);
  return result;
}

function ofType(alerts: AlertCandidate[], type: AlertType) {
  return alerts.filter((a) => a.type === type);
}

// Two weeks (14 covered days), ₪700 a week → pace forecast 1,400 ÷ 14 × 30 = ₪3,000
const TWO_WEEKS = [
  week("c1", "2026-11-01", { spend: 700, revenue: 1400, leads: 10, deals: 2 }),
  week("c1", "2026-11-08", { spend: 700, revenue: 1400, leads: 10, deals: 2 }),
];

describe("spend pace", () => {
  it("alerts when the forecast is 10% or more over the business budget", () => {
    const alerts = ofType(evaluateAlerts(input({ rows: TWO_WEEKS, budget: 2500 }), settings()), "spend_pace");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      severity: "warning",
      campaignId: null,
      deviation: 20,
      dedupeKey: "spend_pace:business:2026-11-01",
    });
    expect(alerts[0].description).toContain("₪3,000");
    expect(alerts[0].description).toContain("20%");
  });

  it("does not alert below the threshold", () => {
    expect(ofType(evaluateAlerts(input({ rows: TWO_WEEKS, budget: 2800 }), settings()), "spend_pace")).toHaveLength(0);
  });

  it("checks each campaign with a budget against its own rows", () => {
    const rows = [...TWO_WEEKS, week("c2", "2026-11-01", { spend: 100 }), week("c2", "2026-11-08", { spend: 100 })];
    const result = evaluateAlerts(
      input({
        rows,
        campaigns: [
          { id: "c1", name: "א" },
          { id: "c2", name: "ב" },
        ],
        campaignBudgets: new Map([
          ["c1", 2000],
          ["c2", 1000],
        ]),
      }),
      settings(),
    );
    const pace = ofType(result, "spend_pace");
    expect(pace.map((a) => a.campaignId)).toEqual(["c1"]);
    expect(pace[0].dedupeKey).toBe("spend_pace:c1:2026-11-01");
    expect(pace[0].deviation).toBe(50);
  });

  it("needs at least 7 covered days", () => {
    const rows = [week("c1", "2026-10-25", { spend: 5000 })]; // no November days covered
    expect(ofType(evaluateAlerts(input({ rows, budget: 100 }), settings()), "spend_pace")).toHaveLength(0);
  });

  it("ignores a campaign without a budget and a type that is off", () => {
    expect(ofType(evaluateAlerts(input({ rows: TWO_WEEKS }), settings()), "spend_pace")).toHaveLength(0);
    const off = settings({ spend_pace: { enabled: false } });
    expect(ofType(evaluateAlerts(input({ rows: TWO_WEEKS, budget: 1000 }), off), "spend_pace")).toHaveLength(0);
  });
});

describe("budget overrun", () => {
  it("is critical once actual spend passes the budget", () => {
    const alerts = ofType(evaluateAlerts(input({ rows: TWO_WEEKS, budget: 1000 }), settings()), "budget_overrun");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ severity: "critical", deviation: 40, step: 10 });
    expect(alerts[0].description).toContain("₪1,400");
  });

  it("does not alert exactly at the budget, or without spend", () => {
    expect(ofType(evaluateAlerts(input({ rows: TWO_WEEKS, budget: 1400 }), settings()), "budget_overrun")).toHaveLength(0);
    const noSpend = [week("c1", "2026-11-01", { revenue: 100 })];
    expect(ofType(evaluateAlerts(input({ rows: noSpend, budget: 10 }), settings()), "budget_overrun")).toHaveLength(0);
  });

  it("uses the threshold as the repeat step when it is above 0", () => {
    const alerts = evaluateAlerts(input({ rows: TWO_WEEKS, budget: 1000 }), settings({ budget_overrun: { percent: 30 } }));
    expect(ofType(alerts, "budget_overrun")[0].step).toBe(30);
  });
});

describe("performance drop", () => {
  // Four weeks at CPL ₪10, then a week at ₪13 (+30%)
  const history = ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"].map((w) =>
    week("c1", w, { spend: 100, leads: 10 }),
  );
  const drop = [...history, week("c1", "2026-11-08", { spend: 130, leads: 10 })];

  it("alerts when the last week's CPL is 25% or more above the weeks before", () => {
    const alerts = ofType(evaluateAlerts(input({ rows: drop }), settings()), "performance_drop");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ campaignId: "c1", deviation: 30, dedupeKey: "performance_drop:c1:2026-11-01" });
    expect(alerts[0].description).toContain("08.11–14.11");
  });

  it("averages CPL as total spend ÷ total leads", () => {
    const rows = [
      week("c1", "2026-10-25", { spend: 100, leads: 20 }),
      week("c1", "2026-11-01", { spend: 300, leads: 20 }),
      week("c1", "2026-11-08", { spend: 130, leads: 10 }),
    ];
    // average = 400 ÷ 40 = 10 → 30%
    expect(ofType(evaluateAlerts(input({ rows }), settings()), "performance_drop")[0].deviation).toBe(30);
  });

  it("needs two earlier weeks with leads", () => {
    const rows = [
      week("c1", "2026-10-25", { spend: 100, leads: 10 }),
      week("c1", "2026-11-01", { spend: 100, leads: 0 }),
      week("c1", "2026-11-08", { spend: 200, leads: 10 }),
    ];
    expect(ofType(evaluateAlerts(input({ rows }), settings()), "performance_drop")).toHaveLength(0);
  });

  it("only looks at a recent last week (this week or the two before)", () => {
    expect(ofType(evaluateAlerts(input({ rows: drop, today: "2026-11-28" }), settings()), "performance_drop")).toHaveLength(1);
    expect(ofType(evaluateAlerts(input({ rows: drop, today: "2026-11-29" }), settings()), "performance_drop")).toHaveLength(0);
  });

  it("is not available without leads in the last week", () => {
    const rows = [...history, week("c1", "2026-11-08", { spend: 130 })];
    expect(ofType(evaluateAlerts(input({ rows }), settings()), "performance_drop")).toHaveLength(0);
  });

  it("compares the number of weeks set by the user", () => {
    // Data for 4.10, 11.10 and 18.10, then 8.11. With 4 weeks to compare
    // (11.10–1.11) two have data; with 2 weeks (25.10, 1.11) none do.
    const fewer = settings({ performance_drop: { weeks: 2 } });
    const rows = [...history.slice(0, 3), week("c1", "2026-11-08", { spend: 130, leads: 10 })];
    expect(ofType(evaluateAlerts(input({ rows }), fewer), "performance_drop")).toHaveLength(0);
    expect(ofType(evaluateAlerts(input({ rows }), settings()), "performance_drop")).toHaveLength(1);
  });

  it("respects the threshold", () => {
    expect(
      ofType(evaluateAlerts(input({ rows: drop }), settings({ performance_drop: { percent: 31 } })), "performance_drop"),
    ).toHaveLength(0);
  });
});

describe("goal at risk", () => {
  // Revenue so far ₪2,800 → forecast ₪6,000; leads 20 → 42.86; ROAS 6,000 ÷ 3,000 = 2
  it("alerts per goal when the forecast is 10% or more below it", () => {
    const goals = { revenue: 8000, deals: 4, leads: 40, min_roas: null };
    const alerts = ofType(evaluateAlerts(input({ rows: TWO_WEEKS, goals }), settings()), "goal_risk");
    expect(alerts.map((a) => a.dedupeKey)).toEqual(["goal_risk:business:revenue:2026-11-01"]);
    expect(alerts[0].deviation).toBe(25);
    expect(alerts[0].description).toContain("₪6,000");
    expect(alerts[0].description).toContain("₪8,000");
  });

  it("alerts on minimum ROAS whenever the expected ROAS is below it", () => {
    const goals = { revenue: null, deals: null, leads: null, min_roas: 3 };
    const alerts = ofType(evaluateAlerts(input({ rows: TWO_WEEKS, goals }), settings({ goal_risk: { percent: 90 } })), "goal_risk");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ dedupeKey: "goal_risk:business:min_roas:2026-11-01", deviation: 33.33, step: 10 });
    expect(alerts[0].description).toContain("2.0");
  });

  it("needs a forecast and a goal", () => {
    expect(ofType(evaluateAlerts(input({ rows: TWO_WEEKS }), settings()), "goal_risk")).toHaveLength(0);
    const short = [week("c1", "2026-10-25", { revenue: 10 })];
    const goals = { revenue: 8000, deals: null, leads: null, min_roas: 3 };
    expect(ofType(evaluateAlerts(input({ rows: short, goals }), settings()), "goal_risk")).toHaveLength(0);
  });
});

describe("goal reached", () => {
  it("is positive when actual reaches the goal, for revenue, deals and leads only", () => {
    const goals = { revenue: 2800, deals: 5, leads: 20, min_roas: 1 };
    const alerts = ofType(evaluateAlerts(input({ rows: TWO_WEEKS, goals }), settings()), "goal_reached");
    expect(alerts.map((a) => a.dedupeKey)).toEqual([
      "goal_reached:business:revenue:2026-11-01",
      "goal_reached:business:leads:2026-11-01",
    ]);
    expect(alerts[0].severity).toBe("info");
    // Numbers are wrapped in left-to-right isolates
    expect(alerts[0].description).toBe("הגעת ליעד ההכנסות של החודש: \u2066₪2,800\u2069 מתוך \u2066₪2,800\u2069.");
  });
});

describe("selectNewAlerts", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  const base = { dedupeKey: "budget_overrun:business:2026-11-01", type: "budget_overrun" } as const;
  const make = (deviation: number, step = 10): AlertCandidate => ({
    ...base,
    severity: "critical",
    campaignId: null,
    month: MONTH,
    deviation,
    step,
    title: "",
    description: "",
  });

  it("keeps an alert with no earlier one", () => {
    expect(selectNewAlerts([make(5)], [], now)).toHaveLength(1);
  });

  it("drops it in the same week unless it grew by the step", () => {
    const earlier = [{ dedupeKey: base.dedupeKey, deviation: 5, createdAt: "2026-11-09T08:00:00Z" }];
    expect(selectNewAlerts([make(14)], earlier, now)).toHaveLength(0);
    expect(selectNewAlerts([make(15)], earlier, now)).toHaveLength(1);
  });

  it("compares with the latest alert of the week", () => {
    const earlier = [
      { dedupeKey: base.dedupeKey, deviation: 5, createdAt: "2026-11-09T08:00:00Z" },
      { dedupeKey: base.dedupeKey, deviation: 15, createdAt: "2026-11-10T08:00:00Z" },
    ];
    expect(selectNewAlerts([make(20)], earlier, now)).toHaveLength(0);
    expect(selectNewAlerts([make(25)], earlier, now)).toHaveLength(1);
  });

  it("alerts again in a new calendar week (Israel time)", () => {
    const lastWeek = [{ dedupeKey: base.dedupeKey, deviation: 50, createdAt: "2026-11-07T20:00:00Z" }];
    expect(selectNewAlerts([make(5)], lastWeek, now)).toHaveLength(1);
    // Saturday 22:30 UTC is already Sunday 00:30 in Israel: same week as `now`
    const sunday = [{ dedupeKey: base.dedupeKey, deviation: 5, createdAt: "2026-11-07T22:30:00Z" }];
    expect(selectNewAlerts([make(6)], sunday, now)).toHaveLength(0);
  });

  it("keeps other keys apart", () => {
    const earlier = [{ dedupeKey: "budget_overrun:c1:2026-11-01", deviation: 50, createdAt: "2026-11-10T08:00:00Z" }];
    expect(selectNewAlerts([make(5)], earlier, now)).toHaveLength(1);
  });

  it("sends goal reached once per month", () => {
    const reached: AlertCandidate = { ...make(0, 0), type: "goal_reached", dedupeKey: "goal_reached:business:revenue:2026-11-01" };
    const earlier = [{ dedupeKey: reached.dedupeKey, deviation: 0, createdAt: "2026-11-02T08:00:00Z" }];
    expect(selectNewAlerts([reached], [], now)).toHaveLength(1);
    expect(selectNewAlerts([reached], earlier, now)).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("loads rows from the forecast history or the compared weeks, whichever is earlier", () => {
    expect(alertRowsFrom(MONTH, TODAY)).toBe("2026-07-26");
    expect(alertRowsFrom("2026-02-01", "2026-02-01")).toBe("2025-10-26");
  });

  it("links each alert to its context", () => {
    expect(alertHref({ type: "performance_drop", campaignId: "c1", month: MONTH })).toBe("/campaigns/c1");
    expect(alertHref({ type: "budget_overrun", campaignId: null, month: MONTH })).toBe("/budget?month=2026-11-01");
    expect(alertHref({ type: "goal_risk", campaignId: null, month: MONTH })).toBe("/forecast?month=2026-11-01");
  });

  it("formats the time stamp in Israel time", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    expect(formatAlertTime("2026-11-12T08:24:00Z", now)).toBe("היום, 10:24");
    expect(formatAlertTime("2026-11-11T14:32:00Z", now)).toBe("אתמול, 16:32");
    expect(formatAlertTime("2026-11-03T07:15:00Z", now)).toBe("03.11.2026, 09:15");
  });
});
