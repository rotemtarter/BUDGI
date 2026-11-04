import type { ActionType } from "./schema";

// User-facing texts of the AI Budget Advisor (DESIGN.md 1.12)

export const ADVISOR_MESSAGES = {
  intro: "שאל על התקציב והקמפיינים שלך. ההמלצות הן הצעות בלבד — שינויים מתבצעים ידנית.",
  notSaved: "השיחה אינה נשמרת ותימחק ביציאה מהמסך. תשובות שתשמור יופיעו בתובנות השמורות.",
  limitReached: "ניצלת את 20 השאלות להיום. אפשר לשאול שוב מחר.",
  failed: "לא הצלחנו לקבל תשובה כרגע. נסה שוב.",
  invalidQuestion: "יש לכתוב שאלה של עד 1,000 תווים",
  noDataTitle: "עוד אין נתונים בחשבון",
  noDataText: "כדי שה-Advisor יוכל לנתח את התקציב, צריך קודם להזין או לייבא נתוני קמפיינים.",
  removedRecommendations: "חלק מההמלצות הוסרו כי לא התאימו לנתונים.",
  placeholder: "שאל שאלה על התקציב או הקמפיינים",
  saveInsight: "שמור תובנה",
  insightSaved: "נשמרה",
  savedToast: "התובנה נשמרה",
  saveFailed: "השמירה נכשלה. נסה שוב.",
  deleteFailed: "המחיקה נכשלה. נסה שוב.",
  insightNotFound: "התובנה לא נמצאה",
  deletedToast: "התובנה נמחקה",
  savedInsights: "תובנות שמורות",
} as const;

export const SUGGESTED_QUESTIONS = [
  "איפה כדאי להגדיל תקציב החודש?",
  "איזה קמפיין הכי פחות יעיל?",
  "האם אעמוד ביעד ההכנסות?",
] as const;

export const ACTION_LABELS: Record<ActionType, string> = {
  reallocate: "העברת תקציב",
  increase: "הגדלה",
  decrease: "הקטנה",
};

