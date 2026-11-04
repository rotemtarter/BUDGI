import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { Amount } from "@/components/common/amount";
import { RevenueSpendChart } from "@/components/charts/revenue-spend-chart";
import { GoalsOverview } from "@/components/dashboard/goal-progress";
import { ForecastOverview } from "@/components/dashboard/forecast-overview";
import { RecentAlerts, RecentInsights } from "@/components/dashboard/recent-items";
import { BudgetDonut } from "@/components/dashboard/budget-donut";
import { NoPeriodData } from "@/components/dashboard/no-data";
import { PeriodHeader, compareLabel } from "@/components/dashboard/period-header";
import { formatMoney } from "@/lib/currency/format";
import { parsePeriod } from "@/lib/dates/period";
import { requireOnboardedUser } from "@/server/auth/session";
import { getHomeData } from "@/server/services/dashboard";
import { listAlerts } from "@/server/repositories/alerts";
import { listInsights } from "@/server/repositories/advisor-insights";

// How many alerts and saved insights the home screen shows
const RECENT = 3;

export const metadata: Metadata = { title: "סקירה כללית · Budgi" };

// Home (DESIGN.md 1.3)
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader title="סקירה כללית" />
      <Suspense fallback={<HomeSkeleton />}>
        {searchParams.then((params) => (
          <Home key={JSON.stringify(params)} params={params} />
        ))}
      </Suspense>
    </>
  );
}

// "Now" (for the default period) is read only after the session check, at request time
async function Home({ params }: { params: Parameters<typeof parsePeriod>[0] }) {
  await requireOnboardedUser();
  const period = parsePeriod(params);
  const [data, alerts, insights] = await Promise.all([
    getHomeData(period),
    listAlerts({ limit: RECENT }),
    listInsights({ limit: RECENT }),
  ]);
  // An unfinished month is compared with the same days of the previous one (ADR-20)
  // The day range in a left-to-right isolate, so "1–7" is not reversed in RTL
  const compare = data.sameDays ? `מול אותם ימים בחודש הקודם (\u20661–${data.sameDays}\u2069)` : compareLabel(period);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <PeriodHeader path="/dashboard" period={period} />
      {!data.hasData ? (
        <NoPeriodData />
      ) : (
        <>
          <section aria-label="נתוני התקופה" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="הכנסות"
              value={<Amount text={formatMoney(data.revenue, { whole: true })} />}
              unavailableReason={data.revenue === null ? "לא הוזנו הכנסות בתקופה" : null}
              change={data.revenueChange}
              compareLabel={compare}
            />
            <KpiCard
              label="הוצאות"
              value={<Amount text={formatMoney(data.spend, { whole: true })} />}
              unavailableReason={data.spend === null ? "לא הוזנה הוצאה בתקופה" : null}
              change={data.spendChange}
              compareLabel={compare}
            />
            {period.kind === "month" && data.budget ? (
              <KpiCard
                label="יתרת תקציב"
                href={`/budget?month=${period.month}`}
                value={<RemainingAmount value={data.budget.remaining} />}
                unavailableReason={data.budget.remaining === null ? "לא הוזנה הוצאה או לא הוגדר תקציב לחודש" : null}
                change={data.sameDays ? undefined : data.budget.change}
                compareLabel={compare}
                compareValue={<BudgetDonut planned={data.budget.planned} spend={data.budget.spend} />}
              />
            ) : (
              <KpiCard
                label="יתרת תקציב"
                href="/budget"
                value={null}
                unavailableReason="לא זמין בתצוגת שבוע. התקציב מוגדר לפי חודש."
              />
            )}
          </section>
          {data.goals && (
            <div className="grid gap-4 lg:grid-cols-2">
              <GoalsOverview goals={data.goals} />
              {data.forecast && <ForecastOverview forecast={data.forecast} />}
            </div>
          )}
          <RevenueSpendChart title="הכנסות מול הוצאות" data={data.chart} variant="line" />
        </>
      )}
      {/* Shown for every period, also without data (DESIGN.md 1.3) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentAlerts alerts={alerts} now={now} />
        <RecentInsights insights={insights} />
      </div>
    </div>
  );
}

// A negative remaining budget shows in the error color with a minus sign
function RemainingAmount({ value }: { value: number | null }) {
  if (value !== null && value < 0) {
    return (
      <span className="text-error">
        <Amount text={`-${formatMoney(-value, { whole: true })}`} />
      </span>
    );
  }
  return <Amount text={formatMoney(value, { whole: true })} />;
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-11 w-80 max-w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
