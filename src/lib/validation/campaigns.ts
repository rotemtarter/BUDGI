import { z } from "zod";
import { CAMPAIGN_STATUSES, PLATFORMS } from "@/lib/campaigns/platforms";
import { numberField } from "./numbers";

// Length limits are a technical safeguard only
const name = z
  .string()
  .trim()
  .min(1, "יש להזין שם קמפיין")
  .max(100, "שם הקמפיין ארוך מדי (עד 100 תווים)");

const platform = z.enum(PLATFORMS, { error: "יש לבחור פלטפורמה" });

// Empty description → null
const description = z
  .string()
  .trim()
  .max(500, "התיאור ארוך מדי (עד 500 תווים)")
  .transform((value) => (value === "" ? null : value));

// DESIGN.md 1.16: name and platform are required; budget for this month and description are optional
export const createCampaignSchema = z.object({
  name,
  platform,
  budget: numberField(),
  description,
});

// DESIGN.md 1.5, "עריכת פרטים"
export const updateCampaignSchema = z.object({
  name,
  platform,
  status: z.enum(CAMPAIGN_STATUSES, { error: "יש לבחור סטטוס" }),
  description,
});

// Planned budget for one month; empty = no budget this month (ADR-7)
export const campaignBudgetSchema = z.object({
  budget: numberField(),
});

export type CreateCampaignInput = z.input<typeof createCampaignSchema>;
export type CreateCampaignValues = z.output<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.input<typeof updateCampaignSchema>;
export type UpdateCampaignValues = z.output<typeof updateCampaignSchema>;
export type CampaignBudgetInput = z.input<typeof campaignBudgetSchema>;
