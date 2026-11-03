import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Amount } from "@/components/common/amount";
import { PlatformBadge } from "@/components/campaigns/badges";
import { MonthSelector } from "@/components/dashboard/period-selector";
import { formatMoney } from "@/lib/currency/format";
import { currentMonth, isMonth } from "@/lib/dates/month";
import { requireOnboardedUser } from "@/server/auth/session";
import { getBudgetData, getBudgetMonths, type BudgetData } from "@/server/services/dashboard";
import { CampaignBudgetEditor, TotalBudgetEditor } from "@/features/budgets/budget-editors";

export const metadata: Metadata = { title: "תקציב · Budgi" };

type Tab = "total" | "campaigns";

// Budget (DESIGN.md 1.6). Month only: budgets are monthly (ADR-9).
export default function BudgetPage({ searchParams }: PageProps<"/budget">) {
  return (
    <>
      <PageHeader title="תקציב" />
      <Suspense fallback={<BudgetSkeleton />}>
        {searchParams.then(({ month, tab }) => (
          <Budget
            key={`${month}-${tab}`}
            requested={typeof month === "string" ? month : undefined}
            tab={tab === "campaigns" ? "campaigns" : "total"}
          />
        ))}
      </Suspense>
    </>
  );
}

async function Budget({ requested, tab }: { requested?: string; tab: Tab }) {
  await requireOnboardedUser();
  const { first, last } = await getBudgetMonths();
  const month = requested && isMonth(requested) && requested >= first && requested <= last ? requested : currentMonth();
  const data = await getBudgetData(month);

  return (
    <div className="flex flex-col gap-6">
      <MonthSelector
        path="/budget"
        month={month}
        firstMonth={first}
        lastMonth={last}
        extraParams={tab === "campaigns" ? "&tab=campaigns" : ""}
      />
      <Tabs month={month} tab={tab} />
      <div role="tabpanel" id="budget-panel" aria-labelledby={`tab-${tab}`}>
        {tab === "total" ? <TotalTab data={data} /> : <CampaignsTab data={data} />}
      </div>
    </div>
  );
}

// Tab switcher kept in the URL (links, so it works without JavaScript)
function Tabs({ month, tab }: { month: string; tab: Tab }) {
  const tabs: [Tab, string][] = [
    ["total", "תקציב חודשי כולל"],
    ["campaigns", "תקציבי קמפיינים"],
  ];
  return (
    <div role="tablist" aria-label="תצוגת תקציב" className="inline-flex w-fit rounded-xl border border-brand-light-gray bg-white p-1">
      {tabs.map(([value, label]) => (
        <Link
          key={value}
          id={`tab-${value}`}
          role="tab"
          aria-selected={tab === value}
          aria-controls="budget-panel"
          scroll={false}
          href={`/budget?month=${month}${value === "campaigns" ? "&tab=campaigns" : ""}`}
          className={cn(
            "inline-flex h-10 items-center rounded-lg px-4 type-small font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === value ? "bg-accent text-primary" : "text-brand-dark hover:bg-muted",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

// "-₪240" in the error color when negative
function SignedAmount({ value, className }: { value: number | null; className?: string }) {
  const negative = value !== null && value < 0;
  return (
    <span className={cn(negative && "text-error", className)} dir="ltr">
      <Amount text={negative ? `-${formatMoney(-value, { whole: true })}` : formatMoney(value, { whole: true })} />
    </span>
  );
}

function Stat({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-small text-muted-foreground">{label}</dt>
      <dd className="type-h3 font-semibold text-brand-dark" style={{ textAlign: "right" }}>
        {children}
      </dd>
      {note}
    </div>
  );
}

function TotalTab({ data }: { data: BudgetData }) {
  const over = data.gap !== null && data.gap < 0;
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="total-title" className="flex flex-col gap-2 rounded-xl border border-brand-light-gray bg-white p-6 shadow-card">
        <h2 id="total-title" className="type-h4 text-muted-foreground">
          תקציב חודשי כולל
        </h2>
        <TotalBudgetEditor month={data.month} amount={data.total} />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="allocated-title" className="rounded-xl border border-brand-light-gray bg-white p-6 shadow-card">
          <h2 id="allocated-title" className="mb-4 type-h4">
            מוקצה לקמפיינים
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="סכום תקציבי הקמפיינים">
              <Amount text={formatMoney(data.allocated, { whole: true })} />
            </Stat>
            <Stat
              label="פער מהתקציב הכולל"
              note={
                over && (
                  <p role="status" className="type-small font-medium text-error">
                    הקצית יותר מהתקציב הכולל
                  </p>
                )
              }
            >
              <SignedAmount value={data.gap} />
            </Stat>
          </dl>
        </section>
        <section aria-labelledby="actual-title" className="rounded-xl border border-brand-light-gray bg-white p-6 shadow-card">
          <h2 id="actual-title" className="mb-4 type-h4">
            מתוכנן מול בפועל
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="הוצאה בפועל">
              <Amount text={formatMoney(data.spend, { whole: true })} />
            </Stat>
            <Stat
              label="יתרה"
              note={
                data.remaining === null && data.total !== null ? (
                  <p className="type-caption text-muted-foreground">לא הוזנה הוצאה בחודש</p>
                ) : undefined
              }
            >
              <SignedAmount value={data.remaining} />
            </Stat>
          </dl>
        </section>
      </div>
    </div>
  );
}

const TH = "px-4 py-3 text-start type-small font-medium text-muted-foreground";
const TD = "px-4 py-3 type-small";
const NUM = { textAlign: "right" } as const;

function CampaignsTab({ data }: { data: BudgetData }) {
  if (data.campaigns.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="אין קמפיינים להקצאת תקציב"
        description={
          data.hasCampaigns
            ? "אין קמפיינים פעילים, ואין קמפיינים עם תקציב או הוצאה בחודש הזה."
            : "צור קמפיין כדי להקצות לו תקציב חודשי."
        }
        actions={
          <Link href="/campaigns/new" className={buttonVariants()}>
            קמפיין חדש
          </Link>
        }
      />
    );
  }

  const totalBudget = data.campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0);
  const anySpend = data.campaigns.some((c) => c.spend !== null);
  const totalSpend = data.campaigns.reduce((sum, c) => sum + (c.spend ?? 0), 0);
  const anyRemaining = data.campaigns.some((c) => c.remaining !== null);
  const totalRemaining = data.campaigns.reduce((sum, c) => sum + (c.remaining ?? 0), 0);

  return (
    <>
      {/* Desktop and tablet */}
      <div className="hidden overflow-x-auto rounded-xl border border-brand-light-gray bg-white shadow-card md:block">
        <table className="w-full border-collapse">
          <thead className="border-b border-brand-light-gray">
            <tr>
              <th scope="col" className={TH}>קמפיין</th>
              <th scope="col" className={TH}>פלטפורמה</th>
              <th scope="col" className={TH}>תקציב מתוכנן</th>
              <th scope="col" className={TH}>הוצאה בפועל</th>
              <th scope="col" className={TH}>יתרה</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((c) => (
              <tr key={c.id} className="border-b border-brand-light-gray">
                <th scope="row" className={`${TD} text-start font-medium`}>
                  <Link href={`/campaigns/${c.id}`} className="text-brand-dark underline-offset-4 hover:underline" dir="auto">
                    {c.name}
                  </Link>
                </th>
                <td className={TD}>
                  <PlatformBadge platform={c.platform} />
                </td>
                <td className={TD}>
                  <CampaignBudgetEditor campaignId={c.id} campaignName={c.name} month={data.month} amount={c.budget} />
                </td>
                <td className={TD} style={NUM}>
                  <Amount text={formatMoney(c.spend, { whole: true })} />
                </td>
                <td className={TD} style={NUM}>
                  <SignedAmount value={c.remaining} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-semibold">
              <th scope="row" colSpan={2} className={`${TD} text-start`}>
                סה״כ
              </th>
              <td className={TD} style={NUM}>
                <Amount text={formatMoney(totalBudget, { whole: true })} />
              </td>
              <td className={TD} style={NUM}>
                <Amount text={formatMoney(anySpend ? totalSpend : null, { whole: true })} />
              </td>
              <td className={TD} style={NUM}>
                <SignedAmount value={anyRemaining ? totalRemaining : null} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile: one card per campaign */}
      <ul className="flex flex-col gap-3 md:hidden">
        {data.campaigns.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/campaigns/${c.id}`} className="type-h4 text-brand-dark" dir="auto">
                {c.name}
              </Link>
              <PlatformBadge platform={c.platform} />
            </span>
            <div className="flex flex-col gap-1">
              <span className="type-caption text-muted-foreground">תקציב מתוכנן</span>
              <CampaignBudgetEditor campaignId={c.id} campaignName={c.name} month={data.month} amount={c.budget} />
            </div>
            <dl className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <dt className="type-caption text-muted-foreground">הוצאה בפועל</dt>
                <dd className="type-small font-medium" style={NUM}>
                  <Amount text={formatMoney(c.spend, { whole: true })} />
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="type-caption text-muted-foreground">יתרה</dt>
                <dd className="type-small font-medium" style={NUM}>
                  <SignedAmount value={c.remaining} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
        <li className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4 type-small font-semibold">
          <span>
            סה״כ תקציב: <Amount text={formatMoney(totalBudget, { whole: true })} />
          </span>
          <span>
            סה״כ הוצאה: <Amount text={formatMoney(anySpend ? totalSpend : null, { whole: true })} />
          </span>
          <span>
            סה״כ יתרה: <SignedAmount value={anyRemaining ? totalRemaining : null} />
          </span>
        </li>
      </ul>
    </>
  );
}

function BudgetSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-11 w-56" />
      <Skeleton className="h-12 w-80 max-w-full" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  );
}
