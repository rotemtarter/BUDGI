import "server-only";
import { addMonths, currentMonth, isMonth } from "@/lib/dates/month";
import { weekMonth } from "@/lib/dates/period";
import { getCampaign, getCampaignBudgets, listCampaigns, type Campaign } from "@/server/repositories/campaigns";
import { listWeeks, listWeeksInRange, type CampaignWeek } from "@/server/repositories/performance";
import {
  hasPeriodData,
  lastDayOfMonth,
  monthSummary,
  percentChange,
  periodSummary,
  remainingBudget,
  weeksRangeForMonth,
  type PeriodSummary,
  type WeekRow,
} from "./metrics";

export type CampaignOverview = Campaign & {
  budget: number | null;
  spend: number | null;
  roas: number | null;
  roasChange: number | null;
};

// Campaigns screen (DESIGN.md 1.4): this month's budget, spend and ROAS, and
// the ROAS change against last month, per campaign
export async function getCampaignsOverview(): Promise<{ month: string; campaigns: CampaignOverview[] }> {
  const month = currentMonth();
  const previous = addMonths(month, -1);

  const [campaigns, budgets, weeks] = await Promise.all([
    listCampaigns(),
    getCampaignBudgets(month),
    listWeeksInRange(weeksRangeForMonth(previous).from, lastDayOfMonth(month)),
  ]);

  const weeksByCampaign = new Map<string, WeekRow[]>();
  for (const { campaignId, ...row } of weeks) {
    const list = weeksByCampaign.get(campaignId) ?? [];
    list.push(row);
    weeksByCampaign.set(campaignId, list);
  }

  return {
    month,
    campaigns: campaigns.map((campaign) => {
      const rows = weeksByCampaign.get(campaign.id) ?? [];
      const current = monthSummary(rows, month);
      const before = monthSummary(rows, previous);
      return {
        ...campaign,
        budget: budgets.get(campaign.id) ?? null,
        spend: current.spend,
        roas: current.roas,
        roasChange: percentChange(current.roas, before.roas),
      };
    }),
  };
}

export type CampaignDetails = {
  campaign: Campaign;
  // The month of the budget and KPI cards, and the months the picker offers
  month: string;
  firstMonth: string;
  lastMonth: string;
  weeks: CampaignWeek[];
  budget: number | null;
  remaining: number | null;
  // Ratios carry the reason when they cannot be calculated (PRD 4.8)
  current: PeriodSummary;
  previous: PeriodSummary;
};

// Campaign details screen (DESIGN.md 1.5). null when not found or not the user's.
// `requested` is the month in the URL (?month=YYYY-MM-01). Without it: this
// month when it has data, otherwise the latest month with data (ADR-19).
export async function getCampaignDetails(id: string, requested?: string): Promise<CampaignDetails | null> {
  const campaign = await getCampaign(id);
  if (!campaign) return null;

  const weeks = await listWeeks(id);
  const thisMonth = currentMonth();
  const weekMonths = weeks.map((w) => weekMonth(w.week_start)).sort();
  const firstMonth = [weekMonths[0], thisMonth].filter(Boolean).sort()[0];
  const lastMonth = addMonths(thisMonth, 1);
  const latestWithData = weekMonths[weekMonths.length - 1];

  let month: string;
  if (requested && isMonth(requested) && requested >= firstMonth && requested <= lastMonth) month = requested;
  else if (hasPeriodData(weeks, { kind: "month", month: thisMonth }) || !latestWithData) month = thisMonth;
  else month = latestWithData < thisMonth ? latestWithData : thisMonth;

  const budgets = await getCampaignBudgets(month);
  const budget = budgets.get(id) ?? null;
  const current = periodSummary(weeks, { kind: "month", month });

  return {
    campaign,
    month,
    firstMonth,
    lastMonth,
    weeks,
    budget,
    remaining: remainingBudget(budget, current.spend),
    current,
    previous: periodSummary(weeks, { kind: "month", month: addMonths(month, -1) }),
  };
}
