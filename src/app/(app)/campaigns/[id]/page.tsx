import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { Amount } from "@/components/common/amount";
import { BackLink } from "@/components/campaigns/back-link";
import { PlatformBadge, StatusBadge } from "@/components/campaigns/badges";
import { PlatformLogo } from "@/components/campaigns/platform-logo";
import { formatMoney } from "@/lib/currency/format";
import { formatRoas } from "@/lib/format/numbers";
import { requireOnboardedUser } from "@/server/auth/session";
import { getCampaignDetails } from "@/server/services/campaigns";
import { percentChange } from "@/server/services/metrics";
import { BudgetCard } from "@/features/campaigns/budget-card";
import { EditCampaignDialog } from "@/features/campaigns/edit-campaign-dialog";
import { WeeksSection } from "@/features/weeks/weeks-section";
import { MonthSelector } from "@/components/dashboard/period-selector";

export const metadata: Metadata = { title: "פרטי קמפיין · Budgi" };

// DESIGN.md 1.5: the main screen for entering weekly data
export default function CampaignPage({ params, searchParams }: PageProps<"/campaigns/[id]">) {
  return (
    <>
      <BackLink />
      <Suspense fallback={<DetailsSkeleton />}>
        {Promise.all([params, searchParams]).then(([{ id }, { month }]) => (
          <CampaignDetails key={String(month)} id={id} month={typeof month === "string" ? month : undefined} />
        ))}
      </Suspense>
    </>
  );
}

async function CampaignDetails({ id, month: requested }: { id: string; month?: string }) {
  await requireOnboardedUser();
  if (!z.uuid().safeParse(id).success) notFound();

  const details = await getCampaignDetails(id, requested);
  if (!details) notFound();
  const { campaign, month, firstMonth, lastMonth, weeks, budget, remaining, current, previous } = details;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <PlatformLogo platform={campaign.platform} size={32} decorative />
              <span dir="auto">{campaign.name}</span>
            </span>
          }
          actions={<EditCampaignDialog campaign={campaign} canDelete={weeks.length === 0} />}
        />
        <div className="-mt-3 flex flex-wrap items-center gap-2">
          <PlatformBadge platform={campaign.platform} />
          <StatusBadge status={campaign.status} />
        </div>
        {campaign.description && (
          <p className="mt-3 max-w-3xl type-body text-muted-foreground" dir="auto">
            {campaign.description}
          </p>
        )}
      </div>

      {/* The month of the budget and KPI cards (ADR-19) */}
      <MonthSelector path={`/campaigns/${campaign.id}`} month={month} firstMonth={firstMonth} lastMonth={lastMonth} />

      <BudgetCard campaignId={campaign.id} campaignName={campaign.name} month={month} budget={budget} spend={current.spend} remaining={remaining} />

      <section aria-label="מדדי החודש" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          size="sm"
          label="CPL"
          value={<Amount text={formatMoney(current.cpl.value, { whole: true })} />}
          change={percentChange(current.cpl.value, previous.cpl.value)}
          unavailableReason={current.cpl.reason}
          lowerIsBetter
        />
        <KpiCard
          size="sm"
          label="Cost per Deal"
          value={<Amount text={formatMoney(current.costPerDeal.value, { whole: true })} />}
          change={percentChange(current.costPerDeal.value, previous.costPerDeal.value)}
          unavailableReason={current.costPerDeal.reason}
          lowerIsBetter
        />
        <KpiCard
          size="sm"
          label="CAC"
          value={<Amount text={formatMoney(current.cac.value, { whole: true })} />}
          change={percentChange(current.cac.value, previous.cac.value)}
          unavailableReason={current.cac.reason}
          lowerIsBetter
        />
        <KpiCard
          size="sm"
          label="ROAS"
          value={formatRoas(current.roas.value)}
          change={percentChange(current.roas.value, previous.roas.value)}
          unavailableReason={current.roas.reason}
        />
      </section>

      <WeeksSection campaignId={campaign.id} campaignName={campaign.name} weeks={weeks} />
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
