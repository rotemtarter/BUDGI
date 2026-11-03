import "server-only";
import { addMonths, currentMonth } from "@/lib/dates/month";
import { addDays } from "@/lib/dates/week";
import { chartWeeks, isSamePeriod, previousPeriod, weekMonth, type Period } from "@/lib/dates/period";
import type { Platform } from "@/lib/campaigns/platforms";
import { getMonthBudget } from "@/server/repositories/budgets";
import { getCampaignBudgets, listCampaigns } from "@/server/repositories/campaigns";
import { getFirstGoalMonth, getGoalsForMonth } from "@/server/repositories/goals";
import { getFirstWeekStart, listWeeksInRange } from "@/server/repositories/performance";
import {
  allocatedBudget,
  budgetGap,
  goalProgress,
  hasPeriodData,
  lastDayOfMonth,
  percentChange,
  periodSummary,
  remainingBudget,
  weeklySeries,
  type PeriodSummary,
  type WeekPoint,
  type WeekRow,
} from "./metrics";

// Data for the home, metrics and budget screens (DESIGN.md 1.3, 1.6, 1.7).
// Metrics are calculated on read; nothing is stored (ARCHITECTURE.md 5.1).

type CampaignWeekRow = WeekRow & { campaignId: string };

// First week start that can have days in the period
function periodStart(period: Period): string {
  return period.kind === "month" ? addDays(period.month, -6) : period.weekStart;
}

function periodEnd(period: Period): string {
  return period.kind === "month" ? lastDayOfMonth(period.month) : period.weekStart;
}

// All weeks needed for the period, the previous period and the chart, in one query
async function weeksForPeriod(period: Period): Promise<CampaignWeekRow[]> {
  const weeks = chartWeeks(period);
  const from = [periodStart(previousPeriod(period)), weeks[0]].sort()[0];
  const to = [periodEnd(period), weeks[weeks.length - 1]].sort().reverse()[0];
  return listWeeksInRange(from, to);
}

// First month in the period pickers: the earliest of the first goals month
// (onboarding) and the first week with data
export async function getFirstMonth(): Promise<string> {
  const [goalMonth, firstWeek] = await Promise.all([getFirstGoalMonth(), getFirstWeekStart()]);
  const months = [goalMonth, firstWeek && weekMonth(firstWeek), currentMonth()].filter(
    (m): m is string => Boolean(m),
  );
  return months.sort()[0];
}

export type HomeData = {
  hasData: boolean;
  revenue: number | null;
  revenueChange: number | null;
  spend: number | null;
  spendChange: number | null;
  // Month view only (budgets are monthly, ADR-9)
  budget: { remaining: number | null; change: number | null } | null;
  revenueGoal: { actual: number | null; target: number | null; progress: number | null } | null;
  chart: WeekPoint[];
};

export async function getHomeData(period: Period): Promise<HomeData> {
  const before = previousPeriod(period);
  const rows = await weeksForPeriod(period);
  const current = periodSummary(rows, period);
  const previous = periodSummary(rows, before);

  let budget: HomeData["budget"] = null;
  let revenueGoal: HomeData["revenueGoal"] = null;
  if (period.kind === "month" && before.kind === "month") {
    const [planned, plannedBefore, goals] = await Promise.all([
      getMonthBudget(period.month),
      getMonthBudget(before.month),
      getGoalsForMonth(period.month),
    ]);
    const remaining = remainingBudget(planned, current.spend);
    const remainingBefore = remainingBudget(plannedBefore, previous.spend);
    // A percent change of a negative remaining budget has no clear meaning
    const comparable = remaining !== null && remaining >= 0 && remainingBefore !== null && remainingBefore > 0;
    budget = { remaining, change: comparable ? percentChange(remaining, remainingBefore) : null };
    revenueGoal = {
      actual: current.revenue,
      target: goals.revenue,
      progress: goalProgress(current.revenue, goals.revenue),
    };
  }

  return {
    hasData: hasPeriodData(rows, period),
    revenue: current.revenue,
    revenueChange: percentChange(current.revenue, previous.revenue),
    spend: current.spend,
    spendChange: percentChange(current.spend, previous.spend),
    budget,
    revenueGoal,
    chart: weeklySeries(rows, chartWeeks(period)),
  };
}

export type CampaignMetrics = {
  id: string;
  name: string;
  platform: Platform;
  summary: PeriodSummary;
};

export type MetricsData = {
  hasData: boolean;
  current: PeriodSummary;
  // The comparison period: the previous one, or one the user picked
  previous: PeriodSummary;
  chart: WeekPoint[];
  campaigns: CampaignMetrics[];
};

// `compare` is the previous period unless the user picked another one (PRD 4.4)
export async function getMetricsData(period: Period, compare: Period = previousPeriod(period)): Promise<MetricsData> {
  const [rows, campaigns, compareRows] = await Promise.all([
    weeksForPeriod(period),
    listCampaigns(),
    // The previous period is already in `rows`
    isSamePeriod(compare, previousPeriod(period))
      ? null
      : listWeeksInRange(periodStart(compare), periodEnd(compare)),
  ]);

  const byCampaign = groupByCampaign(rows);
  const campaignMetrics = campaigns
    .filter((c) => hasPeriodData(byCampaign.get(c.id) ?? [], period))
    .map((c) => ({ id: c.id, name: c.name, platform: c.platform, summary: periodSummary(byCampaign.get(c.id)!, period) }));

  return {
    hasData: hasPeriodData(rows, period),
    current: periodSummary(rows, period),
    previous: periodSummary(compareRows ?? rows, compare),
    chart: weeklySeries(rows, chartWeeks(period)),
    campaigns: campaignMetrics,
  };
}

export type CampaignBudgetRow = {
  id: string;
  name: string;
  platform: Platform;
  budget: number | null;
  spend: number | null;
  remaining: number | null;
};

export type BudgetData = {
  month: string;
  total: number | null;
  allocated: number;
  gap: number | null;
  spend: number | null;
  remaining: number | null;
  campaigns: CampaignBudgetRow[];
  hasCampaigns: boolean;
};

// Budget screen (DESIGN.md 1.6): month only (ADR-9)
export async function getBudgetData(month: string): Promise<BudgetData> {
  const period: Period = { kind: "month", month };
  // getMonthBudget runs the copy to a new month first; campaign budgets wait for it
  const total = await getMonthBudget(month);
  const [campaigns, budgets, rows] = await Promise.all([
    listCampaigns(),
    getCampaignBudgets(month),
    listWeeksInRange(addDays(month, -6), lastDayOfMonth(month)),
  ]);
  const summary = periodSummary(rows, period);
  const byCampaign = groupByCampaign(rows);

  // Active campaigns, and any other campaign with a budget or spend this month
  const campaignRows = campaigns
    .map((c) => {
      const budget = budgets.get(c.id) ?? null;
      const spend = periodSummary(byCampaign.get(c.id) ?? [], period).spend;
      return {
        status: c.status,
        row: { id: c.id, name: c.name, platform: c.platform, budget, spend, remaining: remainingBudget(budget, spend) },
      };
    })
    .filter(({ status, row }) => status === "active" || row.budget !== null || row.spend !== null)
    .map(({ row }) => row);

  const campaignBudgets = campaignRows.map((r) => r.budget);
  return {
    month,
    total,
    allocated: allocatedBudget(campaignBudgets),
    gap: budgetGap(total, campaignBudgets),
    spend: summary.spend,
    remaining: remainingBudget(total, summary.spend),
    campaigns: campaignRows,
    hasCampaigns: campaigns.length > 0,
  };
}

// Months in the budget picker: from the first month to next month (as with goals)
export async function getBudgetMonths(): Promise<{ first: string; last: string }> {
  return { first: await getFirstMonth(), last: addMonths(currentMonth(), 1) };
}

function groupByCampaign(rows: CampaignWeekRow[]): Map<string, WeekRow[]> {
  const map = new Map<string, WeekRow[]>();
  for (const { campaignId, ...row } of rows) {
    const list = map.get(campaignId) ?? [];
    list.push(row);
    map.set(campaignId, list);
  }
  return map;
}
