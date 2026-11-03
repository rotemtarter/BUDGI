import { Suspense } from "react";
import type { Metadata } from "next";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { BackLink } from "@/components/campaigns/back-link";
import { PlatformBadge } from "@/components/campaigns/badges";
import { requireOnboardedUser } from "@/server/auth/session";
import { getCampaign } from "@/server/repositories/campaigns";
import { ImportWizard } from "@/features/imports/import-wizard";

export const metadata: Metadata = { title: "ייבוא נתונים · Budgi" };

// DESIGN.md 1.11. With ?campaign=<id> (from campaign details), the file is
// imported into that campaign only.
export default function ImportsPage({ searchParams }: PageProps<"/imports">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full max-w-4xl rounded-xl" />}>
      <Wizard searchParams={searchParams} />
    </Suspense>
  );
}

async function Wizard({ searchParams }: Pick<PageProps<"/imports">, "searchParams">) {
  await requireOnboardedUser();
  const { campaign: requested } = await searchParams;
  const campaign =
    typeof requested === "string" && z.uuid().safeParse(requested).success ? await getCampaign(requested) : null;

  if (!campaign) {
    return (
      <>
        <PageHeader title="ייבוא נתונים" />
        <ImportWizard />
      </>
    );
  }

  return (
    <>
      <BackLink href={`/campaigns/${campaign.id}`} label={campaign.name} />
      <PageHeader title="ייבוא נתונים לקמפיין" />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <span className="type-body font-medium" dir="auto">
          {campaign.name}
        </span>
        <PlatformBadge platform={campaign.platform} />
      </div>
      {/* key: a fresh wizard when moving between campaigns */}
      <ImportWizard key={campaign.id} campaign={{ id: campaign.id, name: campaign.name }} />
    </>
  );
}
