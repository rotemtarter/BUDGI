"use server";

import { redirect } from "next/navigation";
import { currentMonth } from "@/lib/dates/month";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { requireUser } from "@/server/auth/session";
import { completeOnboarding } from "@/server/repositories/onboarding";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

export async function completeOnboardingAction(input: OnboardingInput): Promise<FormResult> {
  await requireUser();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "יש לתקן את השדות המסומנים" };
  }

  try {
    await completeOnboarding(currentMonth(), parsed.data.budget, parsed.data.revenueGoal);
  } catch (error) {
    console.error("completeOnboarding failed", { code: (error as { code?: string }).code });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }

  redirect("/dashboard");
}
