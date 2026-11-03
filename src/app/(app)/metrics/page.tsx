import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { Amount } from "@/components/common/amount";
import { PlatformBadge } from "@/components/campaigns/badges";
import { RevenueSpendChart } from "@/components/charts/revenue-spend-chart";
import { NoPeriodData } from "@/components/dashboard/no-data";
import { PeriodHeader, compareLabel, compareName } from "@/components/dashboard/period-header";
import { formatMoney } from "@/lib/currency/format";
import { formatCount, formatPercent, formatRoas } from "@/lib/format/numbers";
import { parseCompare, parsePeriod } from "@/lib/dates/period";
import { requireOnboardedUser } from "@/server/auth/session";
import { getMetricsData, type CampaignMetrics } from "@/server/services/dashboard";
import { percentChange, type Metric } from "@/server/services/metrics";

export const metadata: Metadata = { title: "מדדים · Budgi" };

// Metrics (DESIGN.md 1.7)
export default function MetricsPage({ searchParams }: PageProps<"/metrics">) {
  return (
    <>
      <PageHeader title="מדדים" />
      <Suspense fallback={<MetricsSkeleton />}>
        {searchParams.then((params) => (
          <Metrics key={JSON.stringify(params)} params={params} />
        ))}
      </Suspense>
    </>
  );
}

const money = (value: number | null) => <Amount text={formatMoney(value, { whole: true })} />;

// The five KPI cards, their formulas and display (PRD 4.4)
const KPIS: {
  key: "cpl" | "costPerDeal" | "cac" | "roas" | "conversionRate";
  label: string;
  formula: string;
  format: (value: number | null) => ReactNode;
  lowerIsBetter?: boolean;
}[] = [
  { key: "cpl", label: "CPL", formula: "Cost per Lead = הוצאות ÷ לידים", format: money, lowerIsBetter: true },
  { key: "costPerDeal", label: "Cost per Deal", formula: "הוצאות ÷ עסקאות", format: money, lowerIsBetter: true },
  { key: "cac", label: "CAC", formula: "Customer Acquisition Cost = הוצאות ÷ לקוחות חדשים", format: money, lowerIsBetter: true },
  { key: "roas", label: "ROAS", formula: "Return on Ad Spend = הכנסות ÷ הוצאות", format: formatRoas },
  { key: "conversionRate", label: "Conversion Rate", formula: "עסקאות ÷ לידים × 100", format: formatPercent },
];

// "Now" (for the default period) is read only after the session check, at request time
async function Metrics({ params }: { params: Parameters<typeof parsePeriod>[0] & { compare?: string | string[] } }) {
  await requireOnboardedUser();
  const period = parsePeriod(params);
  const comparePeriod = parseCompare(params, period);
  const data = await getMetricsData(period, comparePeriod);
  const compare = compareLabel(period, comparePeriod);
  const compareTitle = compareName(comparePeriod);

  return (
    <div className="flex flex-col gap-6">
      <PeriodHeader path="/metrics" period={period} compare={comparePeriod} />
      {!data.hasData ? (
        <NoPeriodData />
      ) : (
        <>
          <section aria-label="מדדי התקופה" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {KPIS.map((kpi) => {
              const metric: Metric = data.current[kpi.key];
              const before = data.previous[kpi.key].value;
              return (
                <KpiCard
                  key={kpi.key}
                  label={kpi.label}
                  value={kpi.format(metric.value)}
                  unavailableReason={metric.reason}
                  info={
                    <>
                      <span className="font-medium" dir="ltr">
                        {kpi.label}
                      </span>
                      <br />
                      <span dir="auto">{kpi.formula}</span>
                      <br />
                      <span className="text-muted-foreground">מחושב רק משבועות שבהם הוזנו שני הערכים.</span>
                    </>
                  }
                  compareValue={
                    <>
                      {compareTitle}: {before === null ? "לא זמין" : <span dir="ltr">{kpi.format(before)}</span>}
                    </>
                  }
                  change={percentChange(metric.value, before)}
                  lowerIsBetter={kpi.lowerIsBetter}
                  compareLabel={compare}
                />
              );
            })}
          </section>
          <RevenueSpendChart title="מגמת ביצועים" data={data.chart} variant="bar" />
          <CampaignComparison campaigns={data.campaigns} />
        </>
      )}
    </div>
  );
}

const TH = "px-3 py-3 text-start type-small font-medium text-muted-foreground whitespace-nowrap";
const TD = "px-3 py-3 type-small whitespace-nowrap";
const NUM = { textAlign: "right" } as const;

// Campaign comparison for the period. Wide, so it scrolls sideways inside its
// own box on small screens, with the name column kept in place (DESIGN.md 2.4).
function CampaignComparison({ campaigns }: { campaigns: CampaignMetrics[] }) {
  return (
    <section aria-labelledby="comparison-title" className="flex flex-col gap-3">
      <h2 id="comparison-title" className="type-h3">
        השוואת קמפיינים
      </h2>
      <div className="overflow-x-auto rounded-xl border border-brand-light-gray bg-white shadow-card" tabIndex={0} aria-labelledby="comparison-title">
        <table className="w-full border-collapse">
          <thead className="border-b border-brand-light-gray">
            <tr>
              <th scope="col" className={`${TH} sticky right-0 bg-white`}>קמפיין</th>
              <th scope="col" className={TH}>פלטפורמה</th>
              <th scope="col" className={TH}>הוצאות</th>
              <th scope="col" className={TH}>לידים</th>
              <th scope="col" className={TH}>עסקאות</th>
              <th scope="col" className={TH}>לקוחות חדשים</th>
              <th scope="col" className={TH}>הכנסות</th>
              <th scope="col" className={TH}>CPL</th>
              <th scope="col" className={TH}>Cost per Deal</th>
              <th scope="col" className={TH}>CAC</th>
              <th scope="col" className={TH}>ROAS</th>
              <th scope="col" className={TH}>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(({ id, name, platform, summary }) => (
              <tr key={id} className="border-b border-brand-light-gray last:border-0">
                <th scope="row" className={`${TD} sticky right-0 bg-white text-start font-medium`}>
                  <Link href={`/campaigns/${id}`} className="text-brand-dark underline-offset-4 hover:underline" dir="auto">
                    {name}
                  </Link>
                </th>
                <td className={TD}>
                  <PlatformBadge platform={platform} />
                </td>
                <td className={TD} dir="ltr" style={NUM}>{money(summary.spend)}</td>
                <td className={TD} dir="ltr" style={NUM}>{formatCount(summary.leads)}</td>
                <td className={TD} dir="ltr" style={NUM}>{formatCount(summary.deals)}</td>
                <td className={TD} dir="ltr" style={NUM}>{formatCount(summary.newCustomers)}</td>
                <td className={TD} dir="ltr" style={NUM}>{money(summary.revenue)}</td>
                <td className={TD} dir="ltr" style={NUM}>{money(summary.cpl.value)}</td>
                <td className={TD} dir="ltr" style={NUM}>{money(summary.costPerDeal.value)}</td>
                <td className={TD} dir="ltr" style={NUM}>{money(summary.cac.value)}</td>
                <td className={TD} dir="ltr" style={NUM}>{formatRoas(summary.roas.value)}</td>
                <td className={TD} dir="ltr" style={NUM}>{formatPercent(summary.conversionRate.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-caption text-muted-foreground">„—” = לא הוזן או שלא ניתן לחשב מהנתונים שהוזנו.</p>
    </section>
  );
}

function MetricsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-11 w-80 max-w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
