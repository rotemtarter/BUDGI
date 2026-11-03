// Alert types, their defaults and Hebrew texts (PRD 4.6, DESIGN.md 1.9, 1.10).
// Shared by the server and the settings form.

export const ALERT_TYPES = [
  "spend_pace",
  "budget_overrun",
  "performance_drop",
  "goal_risk",
  "goal_reached",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export type AlertSeverity = "info" | "warning" | "critical";

// percent: threshold in percent; weeks: previous weeks to compare (performance drop only)
export type AlertSetting = { enabled: boolean; percent: number; weeks: number };
export type AlertSettings = Record<AlertType, AlertSetting>;

export const DEFAULT_PERFORMANCE_WEEKS = 4;
export const MIN_PERFORMANCE_WEEKS = 2;
export const MAX_PERFORMANCE_WEEKS = 12;
export const MAX_THRESHOLD = 500;

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  spend_pace: { enabled: true, percent: 10, weeks: DEFAULT_PERFORMANCE_WEEKS },
  budget_overrun: { enabled: true, percent: 0, weeks: DEFAULT_PERFORMANCE_WEEKS },
  performance_drop: { enabled: true, percent: 25, weeks: DEFAULT_PERFORMANCE_WEEKS },
  goal_risk: { enabled: true, percent: 10, weeks: DEFAULT_PERFORMANCE_WEEKS },
  goal_reached: { enabled: true, percent: 0, weeks: DEFAULT_PERFORMANCE_WEEKS },
};

export function isAlertType(value: string): value is AlertType {
  return (ALERT_TYPES as readonly string[]).includes(value);
}

// "Goal reached" has an on/off switch only
export function hasThreshold(type: AlertType): boolean {
  return type !== "goal_reached";
}

export const ALERT_SEVERITY: Record<AlertType, AlertSeverity> = {
  spend_pace: "warning",
  budget_overrun: "critical",
  performance_drop: "warning",
  goal_risk: "warning",
  goal_reached: "info",
};

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "חמורה",
  warning: "אזהרה",
  info: "חיובית",
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  spend_pace: "קצב הוצאות",
  budget_overrun: "חריגה מהתקציב",
  performance_drop: "ירידה בביצועים",
  goal_risk: "יעד בסיכון",
  goal_reached: "יעד הושג",
};

export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, string> = {
  spend_pace:
    "כשהתחזית להוצאות החודש גבוהה מהתקציב החודשי (של העסק או של קמפיין) באחוז הזה או יותר.",
  budget_overrun:
    "כשההוצאה בפועל בחודש עוברת את התקציב החודשי (של העסק או של קמפיין) באחוז הזה או יותר. 0% = כל חריגה.",
  performance_drop:
    "כשה-CPL של קמפיין בשבוע האחרון שהוזן גבוה באחוז הזה או יותר מהממוצע של השבועות שלפניו.",
  goal_risk:
    "כשהתחזית לסוף החודש נמוכה מיעד באחוז הזה או יותר. ב-ROAS מינימלי — כשה-ROAS הצפוי נמוך מהמינימום.",
  goal_reached: "כשהגעת ליעד ההכנסות, העסקאות או הלידים של החודש הנוכחי.",
};

// An alert as returned by a save, for the pop-up message
export type NewAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  campaignName: string | null;
};
