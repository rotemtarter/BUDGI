"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { showAlertToasts } from "@/features/alerts/show-alert-toasts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/forms/field";
import { NumberInput } from "@/components/forms/number-input";
import { formatNumberInput } from "@/lib/currency/format";
import { addDays, formatDate, isDateString, startOfWeek } from "@/lib/dates/week";
import { weekSchema, type WeekInput, type WeekValues } from "@/lib/validation/weeks";
import type { WeekRow } from "@/server/services/metrics";
import { saveWeekAction } from "./actions";

const FIELDS = [
  { name: "spend", label: "הוצאה", currency: true },
  { name: "leads", label: "לידים", integer: true },
  { name: "deals", label: "עסקאות", integer: true },
  { name: "new_customers", label: "לקוחות חדשים", integer: true },
  { name: "revenue", label: "הכנסות", currency: true },
] as const;

const EMPTY = { spend: "", leads: "", deals: "", new_customers: "", revenue: "" };

function valuesOf(row: WeekRow) {
  return {
    spend: formatNumberInput(row.spend),
    leads: formatNumberInput(row.leads),
    deals: formatNumberInput(row.deals),
    new_customers: formatNumberInput(row.new_customers),
    revenue: formatNumberInput(row.revenue),
  };
}

// Weekly data entry (DESIGN.md 1.5): modal on desktop, full screen on mobile.
// The dialog always belongs to the chosen week; when that week already has
// data, its values are loaded and saving updates them.
export function WeekDialog({
  campaignId,
  weeks,
  open,
  onOpenChange,
  date,
}: {
  campaignId: string;
  weeks: WeekRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The date the dialog opens with
  date: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted on every open, so the form starts fresh */}
        <WeekForm campaignId={campaignId} weeks={weeks} date={date} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function WeekForm({
  campaignId,
  weeks,
  date,
  onDone,
}: {
  campaignId: string;
  weeks: WeekRow[];
  date: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const findWeek = (weekStart: string) => weeks.find((w) => w.week_start === weekStart);
  const initial = isDateString(date) ? findWeek(startOfWeek(date)) : undefined;

  // Week whose saved values are currently loaded into the fields
  const [loadedWeek, setLoadedWeek] = useState<string | null>(initial?.week_start ?? null);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    control,
    formState: { errors },
  } = useForm<WeekInput, unknown, WeekValues>({
    resolver: zodResolver(weekSchema),
    defaultValues: { date, ...(initial ? valuesOf(initial) : EMPTY) },
  });

  const selectedDate = useWatch({ control, name: "date" });
  const weekStart = isDateString(selectedDate) ? startOfWeek(selectedDate) : null;

  const dateField = register("date");
  const onDateChange = (value: string) => {
    if (!isDateString(value)) return;
    const existing = findWeek(startOfWeek(value));
    if (existing) {
      for (const [name, v] of Object.entries(valuesOf(existing))) setValue(name as keyof typeof EMPTY, v);
      setLoadedWeek(existing.week_start);
    } else if (loadedWeek) {
      // Leaving a week with saved data: do not carry its values to another week
      for (const name of Object.keys(EMPTY)) setValue(name as keyof typeof EMPTY, "");
      setLoadedWeek(null);
    }
  };

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await saveWeekAction(campaignId, getValues());
      if (result.ok) {
        toast.success("נתוני השבוע נשמרו");
        showAlertToasts(result.alerts);
        onDone();
      } else {
        toast.error(result.message);
      }
    });
  });

  const dateError = errors.date?.message;
  const rootError = errors.root?.message;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{loadedWeek ? "עריכת שבוע" : "הוספת שבוע"}</DialogTitle>
        <DialogDescription>שדה ריק נשמר כ&apos;לא הוזן&apos;, לא כאפס.</DialogDescription>
      </DialogHeader>

      <form id="week-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <Field
          id="week-date"
          label="שבוע"
          required
          error={dateError}
          help={
            weekStart ? (
              <span>
                שבוע <span dir="ltr">{formatDate(weekStart)}–{formatDate(addDays(weekStart, 6))}</span> (ראשון–שבת)
              </span>
            ) : (
              "בחר תאריך כלשהו בשבוע"
            )
          }
        >
          <Input
            type="date"
            dir="ltr"
            className="text-right"
            aria-required
            {...fieldA11y("week-date", { error: dateError, help: true })}
            {...dateField}
            onChange={(e) => {
              dateField.onChange(e);
              onDateChange(e.target.value);
            }}
          />
        </Field>

        {loadedWeek && (
          <p role="status" className="rounded-md bg-accent px-3 py-2 type-small text-brand-dark">
            לשבוע הזה כבר יש נתונים — השמירה תעדכן אותם.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => {
            const error = errors[field.name]?.message;
            const id = `week-${field.name}`;
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

        {rootError && (
          <p role="alert" className="type-small text-error">
            {rootError}
          </p>
        )}
      </form>

      <DialogFooter>
        <Button type="submit" form="week-form" disabled={pending}>
          {pending ? "שומר…" : "שמירה"}
        </Button>
        <DialogClose render={<Button variant="secondary" />}>ביטול</DialogClose>
      </DialogFooter>
    </>
  );
}
