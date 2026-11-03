"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/forms/field";
import { NumberInput } from "@/components/forms/number-input";
import {
  ALERT_TYPES,
  ALERT_TYPE_DESCRIPTIONS,
  ALERT_TYPE_LABELS,
  DEFAULT_ALERT_SETTINGS,
  hasThreshold,
  type AlertSettings,
} from "@/lib/alerts/types";
import {
  alertSettingsSchema,
  toAlertSettingsInput,
  type AlertSettingsInput,
} from "@/lib/validation/alert-settings";
import { saveAlertSettingsAction } from "./actions";

// Settings screen, alerts area (DESIGN.md 1.10, area 3): a switch, a short
// description and a threshold per alert type
export function AlertSettingsForm({ settings }: { settings: AlertSettings }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<AlertSettingsInput, unknown, unknown>({
    resolver: zodResolver(alertSettingsSchema),
    defaultValues: toAlertSettingsInput(settings),
  });

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await saveAlertSettingsAction(getValues());
      if (result.ok) {
        toast.success("הגדרות ההתראות נשמרו");
        reset(getValues());
      } else {
        toast.error(result.message);
      }
    });
  });

  // Fills the form with the defaults; they are kept after "שמירה"
  function restoreDefaults() {
    reset(toAlertSettingsInput(DEFAULT_ALERT_SETTINGS), { keepDefaultValues: true });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-brand-light-gray">
        {ALERT_TYPES.map((type) => {
          const switchId = `alert-${type}-enabled`;
          const percentId = `alert-${type}-percent`;
          const weeksId = `alert-${type}-weeks`;
          const percentError = errors[type]?.percent?.message;
          const weeksError = errors[type]?.weeks?.message;
          return (
            <li key={type} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0" data-testid={`alert-setting-${type}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor={switchId} className="type-body font-semibold text-brand-dark">
                    {ALERT_TYPE_LABELS[type]}
                  </label>
                  <p id={`${switchId}-help`} className="type-small text-muted-foreground">
                    {ALERT_TYPE_DESCRIPTIONS[type]}
                  </p>
                </div>
                <Switch id={switchId} describedBy={`${switchId}-help`} {...register(`${type}.enabled`)} />
              </div>
              {hasThreshold(type) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={percentId} label="סף (%)" error={percentError}>
                    <NumberInput integer {...fieldA11y(percentId, { error: percentError })} {...register(`${type}.percent`)} />
                  </Field>
                  {type === "performance_drop" && (
                    <Field id={weeksId} label="מספר שבועות להשוואה" error={weeksError}>
                      <NumberInput integer {...fieldA11y(weeksId, { error: weeksError })} {...register(`${type}.weeks`)} />
                    </Field>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר…" : "שמירת הגדרות התראות"}
        </Button>
        <button
          type="button"
          onClick={restoreDefaults}
          className="type-small font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          החזרה לברירת המחדל
        </button>
      </div>
    </form>
  );
}

// On/off switch: a checkbox with role="switch", so it works with the keyboard
// and screen readers
function Switch({
  describedBy,
  ...props
}: React.ComponentProps<"input"> & { describedBy?: string }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-describedby={describedBy}
        className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-brand-gray outline-none transition-colors checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0.5 right-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:-translate-x-5"
      />
    </span>
  );
}
