"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, fieldA11y } from "@/components/forms/field";
import { NumberInput } from "@/components/forms/number-input";
import {
  onboardingSchema,
  type OnboardingInput,
  type OnboardingValues,
} from "@/lib/validation/onboarding";
import { completeOnboardingAction } from "./actions";

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { budget: "", revenueGoal: "" },
  });

  // Validated on the client, then sent as raw text and validated again on the server
  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await completeOnboardingAction(getValues());
      if (result && !result.ok) toast.error(result.message);
    });
  });

  const budgetError = errors.budget?.message;
  const goalError = errors.revenueGoal?.message;

  return (
    <Card className="w-full">
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <Field id="budget" label="תקציב שיווק חודשי" required error={budgetError}>
            <NumberInput
              currency
              {...fieldA11y("budget", { error: budgetError })}
              aria-required
              {...register("budget")}
            />
          </Field>
          <Field
            id="revenueGoal"
            label="יעד הכנסות חודשי"
            required
            error={goalError}
            help="נמדד מול ההכנסות שתזין לקמפיינים."
          >
            <NumberInput
              currency
              {...fieldA11y("revenueGoal", { error: goalError, help: true })}
              aria-required
              {...register("revenueGoal")}
            />
          </Field>
          <p className="type-small text-muted-foreground">
            יעדים נוספים (עסקאות, לידים, <span dir="ltr">ROAS</span> מינימלי) אפשר להגדיר בהמשך במסך
            ההגדרות.
          </p>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "שומר…" : "התחל לעבוד עם Budgi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
