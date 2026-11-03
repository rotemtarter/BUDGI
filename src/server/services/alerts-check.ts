import "server-only";
import { currentMonth } from "@/lib/dates/month";
import { today } from "@/lib/dates/week";
import type { NewAlert } from "@/lib/alerts/types";
import { getMonthBudget } from "@/server/repositories/budgets";
import { getCampaignBudgets, listCampaigns } from "@/server/repositories/campaigns";
import { getGoalsForMonth } from "@/server/repositories/goals";
import { listWeeksInRange } from "@/server/repositories/performance";
import { findAlertsByKeys, getAlertSettings, insertAlerts } from "@/server/repositories/alerts";
import { alertRowsFrom, alertRowsTo, evaluateAlerts, selectNewAlerts, toNewAlerts } from "./alerts";

// Runs after every manual save (weekly data, budget, goal) and every import
// (PRD 4.6, ARCHITECTURE.md 5.5). A failure here never fails the save: it is
// logged and no alerts are returned (ADR-11).
export async function checkAlerts(userId: string): Promise<NewAlert[]> {
  try {
    const now = new Date();
    const month = currentMonth(now);
    const todayDate = today(now);
    const [rows, campaigns, budget, campaignBudgets, goals, settings] = await Promise.all([
      listWeeksInRange(alertRowsFrom(month, todayDate), alertRowsTo(month)),
      listCampaigns(),
      getMonthBudget(month),
      getCampaignBudgets(month),
      getGoalsForMonth(month),
      getAlertSettings(),
    ]);

    const candidates = evaluateAlerts({ month, today: todayDate, rows, campaigns, budget, campaignBudgets, goals }, settings);
    if (candidates.length === 0) return [];
    const earlier = await findAlertsByKeys([...new Set(candidates.map((c) => c.dedupeKey))]);
    const fresh = selectNewAlerts(candidates, earlier, now);
    const saved = await insertAlerts(userId, fresh);
    return toNewAlerts(saved, fresh, campaigns);
  } catch (error) {
    console.error("checkAlerts failed", { code: (error as { code?: string }).code });
    return [];
  }
}
