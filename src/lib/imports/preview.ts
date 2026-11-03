import type { Platform } from "@/lib/campaigns/platforms";
import { campaignKey } from "./normalize";
import type { ValidRow } from "./rows";

export type ExistingCampaign = { id: string; name: string; platform: Platform };

// A row as sent to commit_import: one name per campaign key
export type CommitRow = {
  name: string;
  platform: Platform;
  week_start: string;
  spend: number | null;
  leads: number | null;
  deals: number | null;
  new_customers: number | null;
  revenue: number | null;
};

export type ImportPlan = {
  newRows: number;
  updatedRows: number;
  newCampaigns: { name: string; platform: Platform }[];
  rows: CommitRow[];
};

// Sorts valid rows into new weeks, updates of existing weeks and campaigns to
// create (PRD 3.4). `existingWeeks` holds "campaignId|weekStart".
export function buildPreview(
  valid: ValidRow[],
  existingCampaigns: ExistingCampaign[],
  existingWeeks: Set<string>,
): ImportPlan {
  const campaigns = new Map(existingCampaigns.map((c) => [campaignKey(c.name, c.platform), c]));
  const newCampaigns = new Map<string, { name: string; platform: Platform }>();
  let newRows = 0;
  let updatedRows = 0;

  const rows = valid.map((row): CommitRow => {
    const campaign = campaigns.get(row.key);
    if (campaign) {
      if (existingWeeks.has(`${campaign.id}|${row.weekStart}`)) updatedRows++;
      else newRows++;
    } else {
      newRows++;
      // A new campaign takes its name from its first row in the file
      if (!newCampaigns.has(row.key)) newCampaigns.set(row.key, { name: row.name, platform: row.platform });
    }
    return {
      name: campaign?.name ?? newCampaigns.get(row.key)!.name,
      platform: row.platform,
      week_start: row.weekStart,
      spend: row.spend,
      leads: row.leads,
      deals: row.deals,
      new_customers: row.new_customers,
      revenue: row.revenue,
    };
  });

  return { newRows, updatedRows, newCampaigns: [...newCampaigns.values()], rows };
}
