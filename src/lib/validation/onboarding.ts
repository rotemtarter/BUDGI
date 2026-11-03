import { z } from "zod";
import { requiredNumberField } from "./numbers";

export const onboardingSchema = z.object({
  budget: requiredNumberField("יש להזין תקציב שיווק חודשי"),
  revenueGoal: requiredNumberField("יש להזין יעד הכנסות חודשי"),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;
