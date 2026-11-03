import { addMonths } from "@/lib/dates/month";
import { addDays, formatWeekRange, startOfWeek, today } from "@/lib/dates/week";
import { formatMoney } from "@/lib/currency/format";
import { formatCount, formatRoas } from "@/lib/format/numbers";
import {
  ALERT_SEVERITY,
  MAX_PERFORMANCE_WEEKS,
  type AlertSettings,
  type AlertSeverity,
  type AlertType,
  type NewAlert,
} from "@/lib/alerts/types";
import type { MonthGoals } from "@/server/repositories/goals";
import { lastDayOfMonth, monthTotal, type WeekRow } from "./metrics";
import { monthForecast, type MonthForecast } from "./forecast";

// Alert Service (PRD 4.6, ARCHITECTURE.md 5.5, ADR-11): checks the five alert
// conditions for the current month after a save or an import, and drops
// duplicates. The functions in this file are pure; checkAlerts() in
// alerts-check.ts loads the data and saves the new alerts.

export type CampaignWeekRow = WeekRow & { campaignId: string };

export type AlertInput = {
  month: string;
  // Today in Israel time
  today: string;
  rows: CampaignWeekRow[];
  campaigns: { id: string; name: string }[];
  budget: number | null;
  campaignBudgets: Map<string, number | null>;
  goals: MonthGoals;
};

export type AlertCandidate = {
  type: AlertType;
  severity: AlertSeverity;
  campaignId: string | null;
  month: string;
  dedupeKey: string;
  // In percent, rounded to 2 decimals (alerts.deviation is numeric(12,2))
  deviation: number;
  // How much the deviation must grow to alert again in the same week
  step: number;
  title: string;
  description: string;
};

// Repeat step when the threshold is 0, and for minimum ROAS (user's decision, ADR-11)
const ZERO_THRESHOLD_STEP = 10;
// Performance drop: only when the campaign's last week is this week or one of the two before it
const RECENT_WEEKS = 2;

export const TITLES: Record<AlertType, string> = {
  spend_pace: "קצב הוצאות גבוה",
  budget_overrun: "חריגה מהתקציב",
  performance_drop: "ירידה בביצועים",
  goal_risk: "יעד בסיכון",
  goal_reached: "יעד הושג",
};

// Numbers, amounts and dates inside Hebrew text stay in left-to-right order
// (DESIGN.md 2.5): wrapped in Unicode isolates (LRI … PDI)
function ltr(text: string): string {
  return `\u2066${text}\u2069`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentText(value: number): string {
  return ltr(`${Math.round(value)}%`);
}

function money(value: number): string {
  return ltr(formatMoney(value, { whole: true }));
}

function stepFor(percent: number): number {
  return percent > 0 ? percent : ZERO_THRESHOLD_STEP;
}

function dedupeKey(type: AlertType, entity: string, month: string): string {
  return `${type}:${entity}:${month}`;
}

// First week start the check needs: the three months before (forecast
// history) and the weeks compared for a performance drop
export function alertRowsFrom(month: string, todayDate: string): string {
  const forecastFrom = addDays(addMonths(month, -3), -6);
  const dropFrom = addDays(startOfWeek(todayDate), -7 * (RECENT_WEEKS + MAX_PERFORMANCE_WEEKS));
  return [forecastFrom, dropFrom].sort()[0];
}

export function alertRowsTo(month: string): string {
  return lastDayOfMonth(month);
}

type Entity = { id: string | null; budget: number; rows: WeekRow[] };

function candidate(
  type: AlertType,
  entity: string | null,
  month: string,
  deviation: number,
  step: number,
  description: string,
  keySuffix?: string,
): AlertCandidate {
  const entityKey = [entity ?? "business", keySuffix].filter(Boolean).join(":");
  return {
    type,
    severity: ALERT_SEVERITY[type],
    campaignId: entity,
    month,
    dedupeKey: dedupeKey(type, entityKey, month),
    deviation: round2(deviation),
    step,
    title: TITLES[type],
    description,
  };
}

function spendPace(entity: Entity, month: string, percent: number): AlertCandidate | null {
  const forecast = monthForecast(entity.rows, month, { ended: false });
  const expected = forecast.spend.forecast;
  if (!forecast.enough || expected === null) return null;
  const deviation = ((expected - entity.budget) / entity.budget) * 100;
  if (deviation < percent) return null;
  const subject = entity.id ? "ההוצאות של הקמפיין" : "ההוצאות";
  const budget = entity.id ? "תקציב הקמפיין" : "התקציב";
  return candidate(
    "spend_pace",
    entity.id,
    month,
    deviation,
    stepFor(percent),
    `לפי הקצב הנוכחי, ${subject} החודש צפויות להגיע ל-${money(expected)} — ${percentText(deviation)} מעל ${budget} (${money(entity.budget)}).`,
  );
}

function budgetOverrun(entity: Entity, month: string, percent: number): AlertCandidate | null {
  const actual = monthTotal(entity.rows, month, "spend");
  if (actual === null || actual <= entity.budget) return null;
  const deviation = ((actual - entity.budget) / entity.budget) * 100;
  if (deviation < percent) return null;
  const subject = entity.id ? "ההוצאה בפועל של הקמפיין" : "ההוצאה בפועל";
  const budget = entity.id ? "תקציב הקמפיין" : "התקציב";
  return candidate(
    "budget_overrun",
    entity.id,
    month,
    deviation,
    stepFor(percent),
    `${subject} החודש (${money(actual)}) עברה את ${budget} (${money(entity.budget)}) ב-${percentText(deviation)}.`,
  );
}

function hasCpl(row: WeekRow): boolean {
  return row.spend !== null && row.leads !== null && Number(row.leads) > 0;
}

// CPL of the campaign's last entered week against the CPL of the weeks
// before it (total spend ÷ total leads, as every ratio in ARCHITECTURE.md 5.3)
function performanceDrop(
  campaignId: string,
  rows: WeekRow[],
  input: AlertInput,
  percent: number,
  weeks: number,
): AlertCandidate | null {
  if (rows.length === 0) return null;
  const last = rows.map((row) => row.week_start).sort()[rows.length - 1];
  if (last < addDays(startOfWeek(input.today), -7 * RECENT_WEEKS)) return null;

  const lastRow = rows.find((row) => row.week_start === last)!;
  if (!hasCpl(lastRow)) return null;

  const from = addDays(last, -7 * weeks);
  const previous = rows.filter((row) => row.week_start >= from && row.week_start < last && hasCpl(row));
  if (previous.length < 2) return null;

  const spend = previous.reduce((sum, row) => sum + Number(row.spend), 0);
  const leads = previous.reduce((sum, row) => sum + Number(row.leads), 0);
  const average = spend / leads;
  if (average === 0) return null;

  const cpl = Number(lastRow.spend) / Number(lastRow.leads);
  const deviation = ((cpl - average) / average) * 100;
  if (deviation < percent) return null;
  return candidate(
    "performance_drop",
    campaignId,
    input.month,
    deviation,
    stepFor(percent),
    `ה-CPL בשבוע ${ltr(formatWeekRange(last))} (${money(cpl)}) גבוה ב-${percentText(deviation)} מהממוצע של השבועות שלפניו (${money(average)}).`,
  );
}

type CountGoal = "revenue" | "deals" | "leads";

const GOAL_SUBJECT: Record<CountGoal, string> = {
  revenue: "ההכנסות",
  deals: "העסקאות",
  leads: "הלידים",
};

function goalValue(goal: CountGoal, value: number): string {
  return goal === "revenue" ? money(value) : ltr(formatCount(value));
}

function goalRisk(forecast: MonthForecast, input: AlertInput, percent: number): AlertCandidate[] {
  if (!forecast.enough) return [];
  const result: AlertCandidate[] = [];
  for (const goal of ["revenue", "deals", "leads"] as const) {
    const target = input.goals[goal];
    const expected = forecast[goal].forecast;
    if (target === null || target <= 0 || expected === null) continue;
    const deviation = ((target - expected) / target) * 100;
    if (deviation < percent) continue;
    result.push(
      candidate(
        "goal_risk",
        null,
        input.month,
        deviation,
        stepFor(percent),
        `לפי התחזית, ${GOAL_SUBJECT[goal]} החודש יגיעו ל-${goalValue(goal, expected)} — ${percentText(deviation)} מתחת ליעד (${goalValue(goal, target)}).`,
        goal,
      ),
    );
  }

  // Minimum ROAS: below the minimum at all; the threshold does not apply
  const minimum = input.goals.min_roas;
  const roas = forecast.roas.forecast;
  if (minimum !== null && minimum > 0 && roas !== null && roas < minimum) {
    result.push(
      candidate(
        "goal_risk",
        null,
        input.month,
        ((minimum - roas) / minimum) * 100,
        ZERO_THRESHOLD_STEP,
        `ה-ROAS הצפוי החודש (${ltr(formatRoas(roas))}) נמוך מהמינימום שהגדרת (${ltr(formatRoas(minimum))}).`,
        "min_roas",
      ),
    );
  }
  return result;
}

// Revenue, deals and leads only; no "goal reached" for minimum ROAS (ADR-11)
function goalReached(input: AlertInput): AlertCandidate[] {
  const result: AlertCandidate[] = [];
  for (const goal of ["revenue", "deals", "leads"] as const) {
    const target = input.goals[goal];
    const actual = monthTotal(input.rows, input.month, goal);
    if (target === null || target <= 0 || actual === null || actual < target) continue;
    const name = GOAL_SUBJECT[goal];
    result.push(
      candidate(
        "goal_reached",
        null,
        input.month,
        0,
        0,
        `הגעת ליעד ${name} של החודש: ${goalValue(goal, actual)} מתוך ${goalValue(goal, target)}.`,
        goal,
      ),
    );
  }
  return result;
}

// All alerts whose condition holds now, for the enabled types
export function evaluateAlerts(input: AlertInput, settings: AlertSettings): AlertCandidate[] {
  const byCampaign = new Map<string, WeekRow[]>();
  for (const { campaignId, ...row } of input.rows) {
    const list = byCampaign.get(campaignId) ?? [];
    list.push(row);
    byCampaign.set(campaignId, list);
  }
  const allRows: WeekRow[] = input.rows;

  const entities: Entity[] = [];
  if (input.budget !== null && input.budget > 0) entities.push({ id: null, budget: input.budget, rows: allRows });
  for (const campaign of input.campaigns) {
    const budget = input.campaignBudgets.get(campaign.id);
    if (budget !== null && budget !== undefined && budget > 0) {
      entities.push({ id: campaign.id, budget, rows: byCampaign.get(campaign.id) ?? [] });
    }
  }

  const result: AlertCandidate[] = [];
  const push = (value: AlertCandidate | null) => value && result.push(value);

  if (settings.spend_pace.enabled) {
    for (const entity of entities) push(spendPace(entity, input.month, settings.spend_pace.percent));
  }
  if (settings.budget_overrun.enabled) {
    for (const entity of entities) push(budgetOverrun(entity, input.month, settings.budget_overrun.percent));
  }
  if (settings.performance_drop.enabled) {
    const { percent, weeks } = settings.performance_drop;
    for (const campaign of input.campaigns) {
      push(performanceDrop(campaign.id, byCampaign.get(campaign.id) ?? [], input, percent, weeks));
    }
  }
  if (settings.goal_risk.enabled) {
    result.push(...goalRisk(monthForecast(allRows, input.month, { ended: false }), input, settings.goal_risk.percent));
  }
  if (settings.goal_reached.enabled) result.push(...goalReached(input));
  return result;
}

export type EarlierAlert = { dedupeKey: string; deviation: number; createdAt: string };

function weekOf(instant: string | Date): string {
  return startOfWeek(today(new Date(instant)));
}

// Drops duplicates (PRD 4.6, ARCHITECTURE.md 5.5): the same key in the same
// calendar week (Sunday–Saturday, Israel time) alerts again only when the
// deviation grew by the step. "Goal reached" alerts once per month.
export function selectNewAlerts(candidates: AlertCandidate[], earlier: EarlierAlert[], now: Date = new Date()): AlertCandidate[] {
  const thisWeek = weekOf(now);
  return candidates.filter((c) => {
    const sameKey = earlier.filter((alert) => alert.dedupeKey === c.dedupeKey);
    if (c.type === "goal_reached") return sameKey.length === 0;
    const sameWeek = sameKey
      .filter((alert) => weekOf(alert.createdAt) === thisWeek)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const previous = sameWeek[sameWeek.length - 1];
    return !previous || c.deviation >= previous.deviation + c.step;
  });
}

export function toNewAlerts(
  saved: { id: string }[],
  candidates: AlertCandidate[],
  campaigns: { id: string; name: string }[],
): NewAlert[] {
  return candidates.map((c, i) => ({
    id: saved[i].id,
    type: c.type,
    severity: c.severity,
    title: c.title,
    description: c.description,
    campaignName: campaigns.find((campaign) => campaign.id === c.campaignId)?.name ?? null,
  }));
}
