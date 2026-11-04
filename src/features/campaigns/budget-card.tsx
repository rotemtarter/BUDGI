"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { showAlertToasts } from "@/features/alerts/show-alert-toasts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldA11y } from "@/components/forms/field";
import { Amount } from "@/components/common/amount";
import { NumberInput } from "@/components/forms/number-input";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumberInput } from "@/lib/currency/format";
import { formatMonthLabel } from "@/lib/dates/month";
import { campaignBudgetSchema, type CampaignBudgetInput } from "@/lib/validation/campaigns";
import { saveCampaignBudgetAction } from "./actions";

// The chosen month's budget card on campaign details (DESIGN.md 1.5):
// planned (editable), actual spend and what is left, with the campaign name
export function BudgetCard({
  campaignId,
  campaignName,
  month,
  budget,
  spend,
  remaining,
}: {
  campaignId: string;
  campaignName: string;
  month: string;
  budget: number | null;
  spend: number | null;
  remaining: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CampaignBudgetInput, unknown, { budget: number | null }>({
    resolver: zodResolver(campaignBudgetSchema),
    defaultValues: { budget: formatNumberInput(budget) },
  });

  const startEditing = () => {
    reset({ budget: formatNumberInput(budget) });
    setEditing(true);
  };

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await saveCampaignBudgetAction(campaignId, getValues());
      if (result.ok) {
        toast.success("התקציב נשמר");
        showAlertToasts(result.alerts);
        setEditing(false);
      } else {
        toast.error(result.message);
      }
    });
  });

  const error = errors.budget?.message;
  const label = `תקציב ${formatMonthLabel(month)} · `;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {label}
          <bdi>{campaignName}</bdi>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="type-small text-muted-foreground">תקציב מתוכנן</dt>
            <dd>
              {editing ? (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
                  <Field id="campaign-budget-edit" label="תקציב מתוכנן לחודש" error={error} help="שדה ריק = אין תקציב לחודש הזה">
                    <NumberInput
                      currency
                      autoFocus
                      {...fieldA11y("campaign-budget-edit", { error, help: true })}
                      {...register("budget")}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? "שומר…" : "שמירה"}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                      ביטול
                    </Button>
                  </div>
                </form>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="type-h3 font-semibold text-brand-dark" dir="ltr">
                    <Amount text={formatMoney(budget)} />
                  </span>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={startEditing} aria-label="עריכת התקציב המתוכנן">
                    <Pencil aria-hidden className="text-primary" />
                  </Button>
                </span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="type-small text-muted-foreground">הוצאה בפועל</dt>
            <dd className="type-h3 font-semibold text-brand-dark" dir="ltr" style={{ textAlign: "right" }}>
              <Amount text={formatMoney(spend, { whole: true })} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="type-small text-muted-foreground">יתרה</dt>
            <dd
              className={cn("type-h3 font-semibold", remaining !== null && remaining < 0 ? "text-error" : "text-brand-dark")}
              dir="ltr"
              style={{ textAlign: "right" }}
            >
              <Amount
                text={
                  remaining !== null && remaining < 0
                    ? `-${formatMoney(-remaining, { whole: true })}`
                    : formatMoney(remaining, { whole: true })
                }
              />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
