"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/common/amount";
import { NumberInput } from "@/components/forms/number-input";
import { formatMoney, formatNumberInput } from "@/lib/currency/format";
import { parseNumber } from "@/lib/validation/numbers";
import type { FormResult } from "@/features/form-result";

// An amount with a pencil icon that turns into a field with save/cancel
// (DESIGN.md 1.6). Used for the total budget and for each campaign's budget.
export function BudgetEditor({
  id,
  label,
  amount,
  required,
  help,
  save,
  valueClassName = "type-h4 font-semibold text-brand-dark",
}: {
  id: string;
  // Accessible name of the field and the edit button
  label: string;
  amount: number | null;
  required?: boolean;
  help?: string;
  save: (input: { budget: string }) => Promise<FormResult>;
  valueClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () => {
    setValue(formatNumberInput(amount));
    setError(null);
    setEditing(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseNumber(value);
    if (!parsed.ok) return setError(parsed.message);
    if (required && parsed.value === null) return setError("יש להזין תקציב");
    startTransition(async () => {
      const result = await save({ budget: value });
      if (result.ok) {
        toast.success("התקציב נשמר");
        setEditing(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={valueClassName} dir="ltr">
          <Amount text={formatMoney(amount)} />
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={start} aria-label={`עריכת ${label}`}>
          <Pencil aria-hidden className="text-primary" />
        </Button>
      </span>
    );
  }

  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-40">
          <NumberInput
            id={id}
            currency
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
          />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="h-11 md:h-10">
          {pending ? "שומר…" : "שמירה"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)} className="h-11 md:h-10">
          ביטול
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="type-small text-error">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="type-caption text-muted-foreground">
            {help}
          </p>
        )
      )}
    </form>
  );
}
