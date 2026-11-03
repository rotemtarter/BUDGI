import { z } from "zod";
import { numberField, requiredNumberField } from "./numbers";

// Total budget for a month (DESIGN.md 1.6); required, as in onboarding
export const monthBudgetSchema = z.object({
  budget: requiredNumberField("יש להזין תקציב חודשי"),
});

export type MonthBudgetInput = z.input<typeof monthBudgetSchema>;
export type MonthBudgetValues = z.output<typeof monthBudgetSchema>;

// One campaign's budget for a month; empty = no budget this month (ADR-7)
export const campaignMonthBudgetSchema = z.object({
  budget: numberField(),
});

export type CampaignMonthBudgetInput = z.input<typeof campaignMonthBudgetSchema>;
