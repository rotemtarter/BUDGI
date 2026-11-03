"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/forms/field";
import { NumberInput } from "@/components/forms/number-input";
import { formatMonthLabel } from "@/lib/dates/month";
import { formatNumberInput } from "@/lib/currency/format";
import { goalsSchema, type GoalsInput, type GoalsValues } from "@/lib/validation/goals";
import type { MonthGoals } from "@/server/repositories/goals";
import { saveGoalsAction } from "./actions";

const FIELDS = [
  { name: "revenue", label: "יעד הכנסות", currency: true },
  { name: "deals", label: "מספר עסקאות", integer: true },
  { name: "leads", label: "מספר לידים", integer: true },
  { name: "min_roas", label: "ROAS מינימלי" },
] as const;

export function GoalsForm({
  month,
  monthOptions,
  goals,
}: {
  month: string;
  monthOptions: string[];
  goals: MonthGoals;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<GoalsInput, unknown, GoalsValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      month,
      revenue: formatNumberInput(goals.revenue),
      deals: formatNumberInput(goals.deals),
      leads: formatNumberInput(goals.leads),
      min_roas: formatNumberInput(goals.min_roas),
    },
  });

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await saveGoalsAction(getValues());
      if (result.ok) {
        toast.success("היעדים נשמרו");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <label htmlFor="goals-month" className="text-sm leading-none font-medium">
          חודש
        </label>
        <select
          id="goals-month"
          value={month}
          onChange={(e) => router.push(`/settings?month=${e.target.value}`, { scroll: false })}
          className="h-11 rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:h-10 md:text-sm"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const error = errors[field.name]?.message;
          const id = `goal-${field.name}`;
          return (
            <Field key={field.name} id={id} label={field.label} error={error}>
              <NumberInput
                currency={"currency" in field}
                integer={"integer" in field}
                {...fieldA11y(id, { error })}
                {...register(field.name)}
              />
            </Field>
          );
        })}
      </div>

      <p className="type-small text-muted-foreground">
        שדה ריק = אין יעד לחודש הזה. יעד ההכנסות נמדד מול ההכנסות שתזין לקמפיינים.
      </p>

      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "שומר…" : "שמירת יעדים"}
      </Button>
    </form>
  );
}
