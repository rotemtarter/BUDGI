import "server-only";
import { addMonths, currentMonth } from "@/lib/dates/month";
import { addDays, today } from "@/lib/dates/week";
import type { Period } from "@/lib/dates/period";
import type { AlertType } from "@/lib/alerts/types";
import type { CampaignStatus, Platform } from "@/lib/campaigns/platforms";
import { getMonthBudget } from "@/server/repositories/budgets";
import { getCampaignBudgets, listCampaigns, type Campaign } from "@/server/repositories/campaigns";
import { getGoalsForMonth, type MonthGoals } from "@/server/repositories/goals";
import { getFirstWeekStart, listWeeksInRange } from "@/server/repositories/performance";
import { listAlerts } from "@/server/repositories/alerts";
import { groupByCampaign } from "./dashboard";
import {
  allocatedBudget,
  budgetGap,
  goalProgress,
  hasPeriodData,
  lastDayOfMonth,
  periodSummary,
  remainingBudget,
  type Metric,
  type PeriodSummary,
  type WeekRow,
} from "./metrics";
import { daysInMonth, monthForecast, type FieldForecast } from "./forecast";

// The data the AI Budget Advisor gets (ARCHITECTURE.md 5.6, 6.4; ADR-12):
// results the Metrics and Forecast services calculated, for the current month
// and the month before. No raw weekly rows and no personal details (name,
// email, business name, user id). null = not entered / not available.

type Value = number | null;
// A ratio is its value, or why it is not available
type MetricValue = number | { not_available: string };

type Summary = {
  spend: Value;
  revenue: Value;
  leads: Value;
  deals: Value;
  new_customers: Value;
  cpl: MetricValue;
  cost_per_deal: MetricValue;
  cac: MetricValue;
  roas: MetricValue;
  conversion_rate_percent: MetricValue;
};

type Forecast = { actual: Value; forecast: Value; basis: string | null; not_available: string | null };

export type ContextCampaign = {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  monthly_budget: Value;
  remaining_budget: Value;
  this_month: Summary;
  previous_month: Summary;
  spend_forecast: Forecast;
};

export type AdvisorContext = {
  today: string;
  month: string;
  days_left_in_month: number;
  currency: "ILS";
  has_any_data: boolean;
  business: {
    monthly_budget: Value;
    allocated_to_campaigns: number;
    // Total budget − campaigns' budgets (negative = over-allocated)
    unallocated_budget: Value;
    // Total budget − actual spend
    remaining_budget: Value;
    goals: { revenue: Value; deals: Value; leads: Value; min_roas: Value };
    this_month: Summary;
    previous_month: Summary;
  };
  forecast: {
    enough_data: boolean;
    covered_days: number;
    days_in_month: number;
    spend: Forecast;
    revenue: Forecast;
    leads: Forecast;
    deals: Forecast;
    roas: Forecast;
    // Expected progress to each goal, in percent
    expected_goal_progress_percent: { revenue: Value; deals: Value; leads: Value; min_roas: Value };
  };
  campaigns: ContextCampaign[];
  // Campaigns left out to keep the request small (MAX_CAMPAIGNS)
  campaigns_not_included: number;
  alerts_this_month: { type: AlertType; title: string; description: string; campaign_id: string | null }[];
};

export type ContextInput = {
  now: Date;
  hasAnyData: boolean;
  rows: WeekRow[];
  rowsByCampaign: Map<string, WeekRow[]>;
  campaigns: Campaign[];
  budget: number | null;
  campaignBudgets: Map<string, number | null>;
  goals: MonthGoals;
  alerts: { type: AlertType; title: string; description: string; month: string; campaignId: string | null }[];
};

const MAX_ALERTS = 10;
// Keeps the request to OpenAI small and its cost bounded (ADR-14)
export const MAX_CAMPAIGNS = 50;

const round = (value: number) => Math.round(value * 100) / 100;
const num = (value: number | null): Value => (value === null ? null : round(value));
const metric = (m: Metric): MetricValue => (m.value === null ? { not_available: m.reason ?? "לא זמין" } : round(m.value));

function summary(s: PeriodSummary): Summary {
  return {
    spend: num(s.spend),
    revenue: num(s.revenue),
    leads: num(s.leads),
    deals: num(s.deals),
    new_customers: num(s.newCustomers),
    cpl: metric(s.cpl),
    cost_per_deal: metric(s.costPerDeal),
    cac: metric(s.cac),
    roas: metric(s.roas),
    conversion_rate_percent: metric(s.conversionRate),
  };
}

function forecast(f: FieldForecast): Forecast {
  return { actual: num(f.actual), forecast: num(f.forecast), basis: f.basis, not_available: f.reason };
}

// Pure: builds the context from data already loaded for the signed-in user
export function buildAdvisorContext(input: ContextInput): AdvisorContext {
  const month = currentMonth(input.now);
  const day = today(input.now);
  const thisMonth: Period = { kind: "month", month };
  const lastMonth: Period = { kind: "month", month: addMonths(month, -1) };

  const business = periodSummary(input.rows, thisMonth);
  const monthForecastResult = monthForecast(input.rows, month, { ended: false });
  const expected = (field: "revenue" | "deals" | "leads" | "roas") => monthForecastResult[field].forecast;

  // Active campaigns, and any other campaign with a budget or data this month
  // or last month. Above MAX_CAMPAIGNS, the ones with the most spend this month
  // (then budget, then last month's spend) are sent.
  const included = input.campaigns
    .map((c) => {
      const rows = input.rowsByCampaign.get(c.id) ?? [];
      const budget = input.campaignBudgets.get(c.id) ?? null;
      const current = periodSummary(rows, thisMonth);
      return {
        include:
          c.status === "active" || budget !== null || hasPeriodData(rows, thisMonth) || hasPeriodData(rows, lastMonth),
        campaign: {
          id: c.id,
          name: c.name,
          platform: c.platform,
          status: c.status,
          monthly_budget: num(budget),
          remaining_budget: num(remainingBudget(budget, current.spend)),
          this_month: summary(current),
          previous_month: summary(periodSummary(rows, lastMonth)),
          spend_forecast: forecast(monthForecast(rows, month, { ended: false }).spend),
        },
      };
    })
    .filter(({ include }) => include)
    .map(({ campaign }) => campaign);
  const weight = (c: ContextCampaign) => [c.this_month.spend ?? 0, c.monthly_budget ?? 0, c.previous_month.spend ?? 0];
  const campaigns =
    included.length <= MAX_CAMPAIGNS
      ? included
      : [...included]
          .sort((x, y) => {
            const [a, b] = [weight(x), weight(y)];
            return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
          })
          .slice(0, MAX_CAMPAIGNS);

  const campaignBudgets = [...input.campaignBudgets.values()];

  return {
    today: day,
    month,
    days_left_in_month: Number(lastDayOfMonth(month).slice(8)) - Number(day.slice(8)),
    currency: "ILS",
    has_any_data: input.hasAnyData,
    business: {
      monthly_budget: num(input.budget),
      allocated_to_campaigns: round(allocatedBudget(campaignBudgets)),
      unallocated_budget: num(budgetGap(input.budget, campaignBudgets)),
      remaining_budget: num(remainingBudget(input.budget, business.spend)),
      goals: {
        revenue: num(input.goals.revenue),
        deals: num(input.goals.deals),
        leads: num(input.goals.leads),
        min_roas: num(input.goals.min_roas),
      },
      this_month: summary(business),
      previous_month: summary(periodSummary(input.rows, lastMonth)),
    },
    forecast: {
      enough_data: monthForecastResult.enough,
      covered_days: monthForecastResult.coveredDays,
      days_in_month: daysInMonth(month),
      spend: forecast(monthForecastResult.spend),
      revenue: forecast(monthForecastResult.revenue),
      leads: forecast(monthForecastResult.leads),
      deals: forecast(monthForecastResult.deals),
      roas: forecast(monthForecastResult.roas),
      expected_goal_progress_percent: {
        revenue: num(goalProgress(expected("revenue"), input.goals.revenue)),
        deals: num(goalProgress(expected("deals"), input.goals.deals)),
        leads: num(goalProgress(expected("leads"), input.goals.leads)),
        min_roas: num(goalProgress(expected("roas"), input.goals.min_roas)),
      },
    },
    campaigns,
    campaigns_not_included: included.length - campaigns.length,
    alerts_this_month: input.alerts
      .filter((a) => a.month === month)
      .slice(0, MAX_ALERTS)
      .map((a) => ({ type: a.type, title: a.title, description: a.description, campaign_id: a.campaignId })),
  };
}

// Loads the signed-in user's data (RLS limits every query to the user) and
// builds the context. The forecast needs the three months before this one.
export async function loadAdvisorContext(now: Date = new Date()): Promise<AdvisorContext> {
  const month = currentMonth(now);
  // getMonthBudget copies last month's budget and goals first; the rest waits for it
  const budget = await getMonthBudget(month);
  const [rows, campaigns, campaignBudgets, goals, alerts, firstWeek] = await Promise.all([
    listWeeksInRange(addDays(addMonths(month, -3), -6), lastDayOfMonth(month)),
    listCampaigns(),
    getCampaignBudgets(month),
    getGoalsForMonth(month),
    listAlerts(),
    getFirstWeekStart(),
  ]);
  return buildAdvisorContext({
    now,
    hasAnyData: firstWeek !== null,
    rows,
    rowsByCampaign: groupByCampaign(rows),
    campaigns,
    budget,
    campaignBudgets,
    goals,
    alerts: alerts.map((a) => ({
      type: a.type,
      title: a.title,
      description: a.description,
      month: a.month,
      campaignId: a.campaign?.id ?? null,
    })),
  });
}
