import "server-only";
import { addMonths, currentMonth } from "@/lib/dates/month";
import { getCampaign, getCampaignBudgets, listCampaigns, type Campaign } from "@/server/repositories/campaigns";
import { listWeeks, listWeeksInRange, type CampaignWeek } from "@/server/repositories/performance";
import {
  lastDayOfMonth,
  monthSummary,
  percentChange,
  remainingBudget,
  weeksRangeForMonth,
  type MonthSummary,
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
  month: string;
  weeks: CampaignWeek[];
  budget: number | null;
  remaining: number | null;
  current: MonthSummary;
  previous: MonthSummary;
};

// Campaign details screen (DESIGN.md 1.5). null when not found or not the user's.
export async function getCampaignDetails(id: string): Promise<CampaignDetails | null> {
  const campaign = await getCampaign(id);
  if (!campaign) return null;

  const month = currentMonth();
  const [weeks, budgets] = await Promise.all([listWeeks(id), getCampaignBudgets(month)]);
  const budget = budgets.get(id) ?? null;
  const current = monthSummary(weeks, month);

  return {
    campaign,
    month,
    weeks,
    budget,
    remaining: remainingBudget(budget, current.spend),
    current,
    previous: monthSummary(weeks, addMonths(month, -1)),
  };
}
