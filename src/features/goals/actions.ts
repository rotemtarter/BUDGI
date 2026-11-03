"use server";

import { addMonths, currentMonth } from "@/lib/dates/month";
import { goalsSchema, type GoalsInput } from "@/lib/validation/goals";
import { requireOnboardedUser } from "@/server/auth/session";
import { saveGoalsForMonth } from "@/server/repositories/goals";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

export async function saveGoalsAction(input: GoalsInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = goalsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "יש לתקן את השדות המסומנים" };
  }

  const { month, ...goals } = parsed.data;
  if (month > addMonths(currentMonth(), 1)) {
    return { ok: false, message: "אפשר להגדיר יעדים עד החודש הבא" };
  }

  try {
    await saveGoalsForMonth(user.id, month, goals);
  } catch (error) {
    console.error("saveGoals failed", { code: (error as { code?: string }).code });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  return { ok: true };
}
