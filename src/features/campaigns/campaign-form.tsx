"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldA11y } from "@/components/forms/field";
import { NumberInput } from "@/components/forms/number-input";
import { ChoiceSelect } from "@/components/forms/choice-select";
import { formatMonthLabel } from "@/lib/dates/month";
import {
  createCampaignSchema,
  type CreateCampaignInput,
  type CreateCampaignValues,
} from "@/lib/validation/campaigns";
import { createCampaignAction } from "./actions";
import { PLATFORM_CHOICES } from "./choices";

// New campaign (DESIGN.md 1.16). Saving opens the campaign's details screen.
export function CampaignForm({ month }: { month: string }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<CreateCampaignInput, unknown, CreateCampaignValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: { name: "", platform: "" as CreateCampaignInput["platform"], budget: "", description: "" },
  });

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await createCampaignAction(getValues());
      if (result && !result.ok) {
        if (result.fieldErrors?.name) setError("name", { message: result.fieldErrors.name }, { shouldFocus: true });
        toast.error(result.message);
      }
    });
  });

  const nameError = errors.name?.message;
  const platformError = errors.platform?.message;
  const budgetError = errors.budget?.message;
  const descriptionError = errors.description?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Field id="campaign-name" label="שם הקמפיין" required error={nameError}>
        <Input dir="auto" aria-required {...fieldA11y("campaign-name", { error: nameError })} {...register("name")} />
      </Field>

      <Field id="campaign-platform" label="פלטפורמה" required error={platformError}>
        <Controller
          control={control}
          name="platform"
          render={({ field }) => (
            <ChoiceSelect
              id="campaign-platform"
              choices={PLATFORM_CHOICES}
              value={field.value}
              onChange={field.onChange}
              placeholder="בחר פלטפורמה"
              invalid={Boolean(platformError)}
              describedBy={platformError ? "campaign-platform-error" : undefined}
            />
          )}
        />
      </Field>

      <Field
        id="campaign-budget"
        label={`תקציב מתוכנן ל${formatMonthLabel(month)}`}
        error={budgetError}
        help="אופציונלי. אפשר להגדיר או לשנות בהמשך."
      >
        <NumberInput currency {...fieldA11y("campaign-budget", { error: budgetError, help: true })} {...register("budget")} />
      </Field>

      <Field id="campaign-description" label="תיאור" error={descriptionError} help="אופציונלי">
        <Textarea
          dir="auto"
          rows={3}
          {...fieldA11y("campaign-description", { error: descriptionError, help: true })}
          {...register("description")}
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר…" : "שמירה"}
        </Button>
        <Link href="/campaigns" className={buttonVariants({ variant: "secondary" })}>
          ביטול
        </Link>
      </div>
    </form>
  );
}
