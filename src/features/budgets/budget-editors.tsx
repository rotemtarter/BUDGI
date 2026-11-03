"use client";

import { BudgetEditor } from "./budget-editor";
import { saveCampaignMonthBudgetAction, saveMonthBudgetAction } from "./actions";

// The month's total budget (DESIGN.md 1.6, total tab)
export function TotalBudgetEditor({ month, amount }: { month: string; amount: number | null }) {
  return (
    <BudgetEditor
      id="total-budget"
      label="התקציב החודשי הכולל"
      amount={amount}
      required
      valueClassName="type-h2 font-semibold text-brand-dark"
      save={(input) => saveMonthBudgetAction(month, input)}
    />
  );
}

// One campaign's budget for the month (DESIGN.md 1.6, campaigns tab)
export function CampaignBudgetEditor({
  campaignId,
  campaignName,
  month,
  amount,
}: {
  campaignId: string;
  campaignName: string;
  month: string;
  amount: number | null;
}) {
  return (
    <BudgetEditor
      id={`campaign-budget-${campaignId}`}
      label={`תקציב מתוכנן של ${campaignName}`}
      amount={amount}
      help="שדה ריק = אין תקציב לחודש הזה"
      valueClassName="type-small font-medium text-brand-dark"
      save={(input) => saveCampaignMonthBudgetAction(campaignId, month, input)}
    />
  );
}
