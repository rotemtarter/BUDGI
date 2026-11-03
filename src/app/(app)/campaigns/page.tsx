import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ChangeIndicator } from "@/components/common/change-indicator";
import { Amount } from "@/components/common/amount";
import { PlatformBadge, StatusBadge } from "@/components/campaigns/badges";
import { formatMoney } from "@/lib/currency/format";
import { formatRoas } from "@/lib/format/numbers";
import { formatMonthLabel } from "@/lib/dates/month";
import { isCampaignStatus } from "@/lib/campaigns/platforms";
import { requireOnboardedUser } from "@/server/auth/session";
import { getCampaignsOverview, type CampaignOverview } from "@/server/services/campaigns";
import { StatusFilter, type StatusFilterValue } from "@/features/campaigns/status-filter";

export const metadata: Metadata = { title: "קמפיינים · Budgi" };

// DESIGN.md 1.4
export default function CampaignsPage({ searchParams }: PageProps<"/campaigns">) {
  return (
    <>
      <PageHeader
        title="קמפיינים"
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/campaigns/new" className={buttonVariants()}>
              קמפיין חדש
            </Link>
            <Link href="/imports" className={buttonVariants({ variant: "secondary" })}>
              ייבוא נתונים
            </Link>
          </div>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <CampaignList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CampaignList({ searchParams }: Pick<PageProps<"/campaigns">, "searchParams">) {
  await requireOnboardedUser();
  const { status: requested } = await searchParams;
  const filter: StatusFilterValue =
    typeof requested === "string" && (requested === "all" || isCampaignStatus(requested)) ? requested : "active";

  const { month, campaigns } = await getCampaignsOverview();

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="עוד לא נוצרו קמפיינים"
        description="צור קמפיין ראשון כדי להתחיל להזין נתונים שבועיים."
        actions={
          <Link href="/campaigns/new" className={buttonVariants()}>
            קמפיין חדש
          </Link>
        }
      />
    );
  }

  const shown = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter value={filter} />
      <p className="type-small text-muted-foreground">נתוני {formatMonthLabel(month)}</p>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-brand-light-gray bg-white px-6 py-10 text-center type-body text-muted-foreground shadow-card">
          אין קמפיינים בסטטוס הזה
        </p>
      ) : (
        <>
          <CampaignTable campaigns={shown} />
          <CampaignCards campaigns={shown} />
        </>
      )}
    </div>
  );
}

const TH = "px-4 py-3 text-start type-small font-medium text-muted-foreground";
const TD = "px-4 py-3 type-small";

// Desktop and tablet: a table; the campaign name links to its details
function CampaignTable({ campaigns }: { campaigns: CampaignOverview[] }) {
  return (
    <div className="relative hidden overflow-x-auto rounded-xl border border-brand-light-gray bg-white shadow-card md:block">
      <table className="w-full border-collapse">
        <thead className="border-b border-brand-light-gray">
          <tr>
            <th scope="col" className={TH}>שם קמפיין</th>
            <th scope="col" className={TH}>פלטפורמה</th>
            <th scope="col" className={TH}>סטטוס</th>
            <th scope="col" className={TH}>תקציב חודשי</th>
            <th scope="col" className={TH}>הוצאה בפועל החודש</th>
            <th scope="col" className={TH}>ROAS החודש</th>
            <th scope="col" className={TH}>שינוי ב-ROAS</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="relative border-b border-brand-light-gray last:border-0 hover:bg-accent/50">
              <td className={TD}>
                {/* The link covers the whole row (::after), so the row is clickable */}
                <Link
                  href={`/campaigns/${c.id}`}
                  className="font-medium text-brand-dark outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  dir="auto"
                >
                  {c.name}
                </Link>
              </td>
              <td className={TD}>
                <PlatformBadge platform={c.platform} />
              </td>
              <td className={TD}>
                <StatusBadge status={c.status} />
              </td>
              <td className={TD} dir="ltr" style={{ textAlign: "right" }}>
                <Amount text={formatMoney(c.budget)} />
              </td>
              <td className={TD} dir="ltr" style={{ textAlign: "right" }}>
                <Amount text={formatMoney(c.spend, { whole: true })} />
              </td>
              <td className={TD} dir="ltr" style={{ textAlign: "right" }}>
                {formatRoas(c.roas)}
              </td>
              <td className={TD}>
                <ChangeIndicator change={c.roasChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mobile: one card per campaign (DESIGN.md 1.4)
function CampaignCards({ campaigns }: { campaigns: CampaignOverview[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {campaigns.map((c) => (
        <li key={c.id}>
          <Link
            href={`/campaigns/${c.id}`}
            className="flex flex-col gap-3 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="type-h4 text-brand-dark" dir="auto">
                {c.name}
              </span>
              <PlatformBadge platform={c.platform} />
              <StatusBadge status={c.status} />
              <ChevronLeft aria-hidden className="ms-auto size-5 text-muted-foreground" />
            </span>
            <dl className="grid grid-cols-3 gap-2">
              <CardValue label="תקציב" value={<Amount text={formatMoney(c.budget)} />} />
              <CardValue label="הוצאה" value={<Amount text={formatMoney(c.spend, { whole: true })} />} />
              <CardValue label="ROAS" value={formatRoas(c.roas)} />
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CardValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-small font-medium text-brand-dark" dir="ltr" style={{ textAlign: "right" }}>
        {value}
      </dd>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
