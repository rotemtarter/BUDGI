"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatMonthLabel, monthsBetween } from "@/lib/dates/month";
import { formatDate, addDays, isDateString, startOfWeek } from "@/lib/dates/week";
import {
  isSamePeriod,
  monthWeek,
  periodToSearch,
  periodValue,
  previousPeriod,
  weekMonth,
  type Period,
} from "@/lib/dates/period";

const SELECT =
  "h-11 rounded-md border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:h-10 md:text-sm";

// Month or week picker for the home and metrics screens (PRD 4.2, DESIGN.md
// 1.3, 1.7). The choice lives in the URL, so the server renders the new period.
export function PeriodSelector({
  path,
  period,
  firstMonth,
  lastMonth,
  today,
}: {
  path: string;
  period: Period;
  firstMonth: string;
  lastMonth: string;
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: Period) => {
    startTransition(() => router.push(`${path}?${periodToSearch(next)}`, { scroll: false }));
  };

  const switchTo = (kind: Period["kind"]) => {
    if (kind === period.kind) return;
    if (period.kind === "month") go({ kind: "week", weekStart: monthWeek(period.month) });
    else go({ kind: "month", month: weekMonth(period.weekStart) });
  };

  const months = monthsBetween(firstMonth, lastMonth).reverse();

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending || undefined}>
      <div role="group" aria-label="סוג תקופה" className="inline-flex rounded-xl border border-brand-light-gray bg-white p-1">
        {(
          [
            ["month", "חודש"],
            ["week", "שבוע"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={period.kind === kind}
            onClick={() => switchTo(kind)}
            className={cn(
              "h-9 rounded-lg px-4 type-small font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8",
              period.kind === kind ? "bg-accent text-primary" : "text-brand-dark hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {period.kind === "month" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="period-month" className="type-caption text-muted-foreground">
            חודש
          </label>
          <select
            id="period-month"
            value={period.month}
            onChange={(e) => go({ kind: "month", month: e.target.value })}
            className={SELECT}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="period-week" className="type-caption text-muted-foreground">
            שבוע (בחר תאריך כלשהו בשבוע)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="period-week"
              type="date"
              dir="ltr"
              value={period.weekStart}
              max={today}
              aria-describedby="period-week-range"
              onChange={(e) => {
                const value = e.target.value;
                if (isDateString(value) && value <= today) go({ kind: "week", weekStart: startOfWeek(value) });
              }}
              className={cn(SELECT, "text-right")}
            />
            <span id="period-week-range" className="type-small text-muted-foreground">
              ראשון–שבת,{" "}
              <span dir="ltr">
                {formatDate(period.weekStart)}–{formatDate(addDays(period.weekStart, 6))}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Month-only picker for the budget screen (DESIGN.md 1.6, ADR-9)
export function MonthSelector({
  path,
  month,
  firstMonth,
  lastMonth,
  extraParams = "",
}: {
  path: string;
  month: string;
  firstMonth: string;
  lastMonth: string;
  extraParams?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const months = monthsBetween(firstMonth, lastMonth).reverse();

  return (
    <div className="flex w-full flex-col gap-1 sm:w-64" aria-busy={pending || undefined}>
      <label htmlFor="budget-month" className="type-caption text-muted-foreground">
        חודש
      </label>
      <select
        id="budget-month"
        value={month}
        onChange={(e) =>
          startTransition(() => router.push(`${path}?month=${e.target.value}${extraParams}`, { scroll: false }))
        }
        className={SELECT}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {formatMonthLabel(m)}
          </option>
        ))}
      </select>
    </div>
  );
}

// "Compare to" picker on the metrics screen (PRD 4.4, DESIGN.md 1.7): another
// month or week, of the same kind as the chosen period. The previous period is
// the default and is left out of the URL.
export function CompareSelector({
  path,
  period,
  compare,
  firstMonth,
  lastMonth,
  today,
}: {
  path: string;
  period: Period;
  compare: Period;
  firstMonth: string;
  lastMonth: string;
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: Period) => {
    const extra = isSamePeriod(next, previousPeriod(period)) ? "" : `&compare=${periodValue(next)}`;
    startTransition(() => router.push(`${path}?${periodToSearch(period)}${extra}`, { scroll: false }));
  };

  if (compare.kind === "month") {
    const months = monthsBetween(firstMonth, lastMonth)
      .reverse()
      .filter((m) => period.kind !== "month" || m !== period.month);
    // A month before the first one (e.g. the default previous month) is still listed
    if (!months.includes(compare.month)) months.push(compare.month);
    return (
      <div className="flex flex-col gap-1" aria-busy={pending || undefined}>
        <label htmlFor="compare-month" className="type-caption text-muted-foreground">
          השוואה ל־
        </label>
        <select
          id="compare-month"
          value={compare.month}
          onChange={(e) => go({ kind: "month", month: e.target.value })}
          className={SELECT}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" aria-busy={pending || undefined}>
      <label htmlFor="compare-week" className="type-caption text-muted-foreground">
        השוואה לשבוע (בחר תאריך כלשהו בשבוע)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="compare-week"
          type="date"
          dir="ltr"
          value={compare.weekStart}
          max={today}
          aria-describedby="compare-week-range"
          onChange={(e) => {
            const value = e.target.value;
            if (isDateString(value) && value <= today) go({ kind: "week", weekStart: startOfWeek(value) });
          }}
          className={cn(SELECT, "text-right")}
        />
        <span id="compare-week-range" className="type-small text-muted-foreground">
          <span dir="ltr">
            {formatDate(compare.weekStart)}–{formatDate(addDays(compare.weekStart, 6))}
          </span>
        </span>
      </div>
    </div>
  );
}
