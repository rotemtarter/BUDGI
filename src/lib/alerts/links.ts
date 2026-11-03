import type { AlertType } from "./types";

// Where an alert leads (DESIGN.md 1.9): the campaign, the budget screen or
// the forecast screen of the alert's month
export function alertHref(alert: { type: AlertType; campaignId: string | null; month: string }): string {
  if (alert.campaignId) return `/campaigns/${alert.campaignId}`;
  if (alert.type === "budget_overrun") return `/budget?month=${alert.month}`;
  return `/forecast?month=${alert.month}`;
}
