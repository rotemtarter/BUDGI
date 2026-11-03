import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { BackLink } from "@/components/campaigns/back-link";
import { currentMonth } from "@/lib/dates/month";
import { requireOnboardedUser } from "@/server/auth/session";
import { CampaignForm } from "@/features/campaigns/campaign-form";

export const metadata: Metadata = { title: "קמפיין חדש · Budgi" };

// DESIGN.md 1.16
export default function NewCampaignPage() {
  return (
    <>
      <BackLink />
      <PageHeader title="קמפיין חדש" />
      <Card className="max-w-2xl">
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <Form />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

// "This month" is read at request time
async function Form() {
  await requireOnboardedUser();
  return <CampaignForm month={currentMonth()} />;
}
