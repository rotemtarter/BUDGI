import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { Amount } from "@/components/common/amount";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { MonthSelector } from "@/components/dashboard/period-selector";
import { NoPeriodData } from "@/components/dashboard/no-data";
import { BASIS_LABEL, ForecastBasis } from "@/components/forecast/forecast-basis";
import { NotEnoughData } from "@/components/forecast/not-enough-data";
import { formatMoney } from "@/lib/currency/format";
import { currentMonth, isMonth } from "@/lib/dates/month";
import { formatCount, formatPercent, formatRoas } from "@/lib/format/numbers";
import { requireOnboardedUser } from "@/server/auth/session";
import { getFirstMonth, getForecastData, type ForecastData, type GoalForecast } from "@/server/services/dashboard";
import type { FieldForecast } from "@/server/services/forecast";

export const metadata: Metadata = { title: "תחזית חודשית · Budgi" };

// Monthly forecast (DESIGN.md 1.8). Month only, kept in the URL as
// ?month=YYYY-MM-01 like the budget screen (ADR-10).
export default function ForecastPage({ searchParams }: PageProps<"/forecast">) {
  return (
    <>
      <PageHeader title="תחזית חודשית" />
      <Suspense fallback={<ForecastSkeleton />}>
        {searchParams.then(({ month }) => (
          <Forecast key={String(month)} requested={typeof month === "string" ? month : undefined} />
        ))}
      </Suspense>
    </>
  );
}

async function Forecast({ requested }: { requested?: string }) {
  await requireOnboardedUser();
  const first = await getFirstMonth();
  const last = currentMonth();
  // Invalid, future or too early → the current month
  const month = requested && isMonth(requested) && requested >= first && requested <= last ? requested : last;
  const data = await getForecastData(month);
  const { forecast } = data;

  return (
    <div className="flex flex-col gap-6">
      <MonthSelector path="/forecast" month={month} firstMonth={first} lastMonth={last} />
      {forecast.ended && !data.hasData ? (
        <NoPeriodData />
      ) : !forecast.enough ? (
        <NotEnoughData />
      ) : (
        <ForecastContent data={data} />
      )}
    </div>
  );
}

function ForecastContent({ data }: { data: ForecastData }) {
  const { forecast, progress } = data;
  const ended = forecast.ended;
  // The basis shown in the line; a card with another basis notes its own
  const basis = forecast.revenue.basis ?? forecast.spend.basis;
  const basisNote = (field: FieldForecast) =>
    !ended && field.basis && field.basis !== basis ? BASIS_LABEL[field.basis] : undefined;

  const extraGoals = (
    [
      ["deals", ended ? "עסקאות בפועל" : "עסקאות צפויות", forecast.deals, formatCount, "יעד עסקאות"],
      ["leads", ended ? "לידים בפועל" : "לידים צפויים", forecast.leads, formatCount, "יעד לידים"],
      ["min_roas", ended ? "ROAS בפועל" : "ROAS צפוי", forecast.roas, formatRoas, "ROAS מינימלי"],
    ] as const
  ).filter(([goal]) => data.goals[goal] !== null);

  return (
    <>
      <section aria-label="תחזית החודש" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label={ended ? "הוצאות בפועל" : "הוצאות צפויות"}
          value={<Amount text={formatMoney(shown(forecast.spend, ended), { whole: true })} />}
          unavailableReason={unavailable(forecast.spend, ended, "לא הוזנה הוצאה בחודש")}
          note={basisNote(forecast.spend)}
          compareValue={
            <Details>
              {!ended && <ActualSoFar value={forecast.spend.actual} />}
              <span>
                תקציב:{" "}
                {data.budget === null ? "לא הוגדר" : <Amount text={formatMoney(data.budget, { whole: true })} />}
              </span>
            </Details>
          }
        />
        <KpiCard
          label={ended ? "הכנסות בפועל" : "הכנסות צפויות"}
          value={<Amount text={formatMoney(shown(forecast.revenue, ended), { whole: true })} />}
          unavailableReason={unavailable(forecast.revenue, ended, "לא הוזנו הכנסות בחודש")}
          note={basisNote(forecast.revenue)}
          compareValue={
            <Details>
              {!ended && <ActualSoFar value={forecast.revenue.actual} />}
              <span>
                יעד:{" "}
                {data.goals.revenue === null ? "לא הוגדר" : <Amount text={formatMoney(data.goals.revenue, { whole: true })} />}
              </span>
            </Details>
          }
        />
        <KpiCard
          label={ended ? "התקדמות ליעד" : "התקדמות צפויה ליעד"}
          value={<span dir="ltr">{formatPercent(progress.revenue.progress)}</span>}
          unavailableReason={progressUnavailable(progress.revenue, forecast.revenue, ended, "לא הוגדר יעד הכנסות לחודש")}
          compareValue={
            data.goals.revenue === null ? (
              <SettingsLink />
            ) : (
              <span>
                מיעד ההכנסות (<Amount text={formatMoney(data.goals.revenue, { whole: true })} />)
              </span>
            )
          }
        />
      </section>

      {extraGoals.length > 0 && (
        <section aria-label="יעדים נוספים" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {extraGoals.map(([goal, label, field, format, targetLabel]) => {
            const item = progress[goal];
            return (
              <KpiCard
                key={goal}
                size="sm"
                label={label}
                value={<span dir="ltr">{format(item.value)}</span>}
                unavailableReason={item.value === null ? (field.reason ?? "לא הוזנו נתונים בחודש") : null}
                note={basisNote(field)}
                compareValue={
                  <span>
                    {targetLabel}: <span dir="ltr">{format(item.target)}</span>
                    {item.progress !== null && (
                      <>
                        {" "}
                        · <span dir="ltr">{formatPercent(item.progress)}</span> {ended ? "מהיעד" : "מהיעד (צפוי)"}
                      </>
                    )}
                  </span>
                }
              />
            );
          })}
        </section>
      )}

      {!ended && basis && (
        <ForecastBasis
          basis={basis}
          month={data.month}
          coveredDays={forecast.coveredDays}
          daysInMonth={forecast.daysInMonth}
        />
      )}

      <ForecastChart
        title={ended ? "הכנסות מול הוצאות" : "הכנסות מול הוצאות (תחזית)"}
        data={data.chart}
        forecast={!ended}
      />
    </>
  );
}

// The forecast, or for an ended month the actual value
function shown(field: FieldForecast, ended: boolean): number | null {
  return ended ? field.actual : field.forecast;
}

function unavailable(field: FieldForecast, ended: boolean, missing: string): string | null {
  if (shown(field, ended) !== null) return null;
  return ended ? missing : (field.reason ?? missing);
}

function progressUnavailable(item: GoalForecast, field: FieldForecast, ended: boolean, noGoal: string): string | null {
  if (item.progress !== null) return null;
  if (item.target === null || item.target === 0) return noGoal;
  return unavailable(field, ended, "לא הוזנו הכנסות בחודש");
}

function Details({ children }: { children: ReactNode }) {
  return <span className="flex flex-col gap-0.5">{children}</span>;
}

function ActualSoFar({ value }: { value: number | null }) {
  return (
    <span>
      בפועל עד כה: <Amount text={formatMoney(value, { whole: true })} />
    </span>
  );
}

function SettingsLink() {
  return (
    <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
      הגדרת יעדים
    </Link>
  );
}

function ForecastSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-11 w-56" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
