import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { addMonths, currentMonth, isMonth, monthsBetween } from "@/lib/dates/month";
import { requireOnboardedUser } from "@/server/auth/session";
import { getFirstGoalMonth, getGoalsForMonth } from "@/server/repositories/goals";
import { GoalsForm } from "@/features/goals/goals-form";
import { signOutAction } from "@/features/auth/actions";
import { BusinessNameForm } from "@/features/profile/business-name-form";
import { AlertSettingsForm } from "@/features/alerts/alert-settings-form";
import { getAlertSettings } from "@/server/repositories/alerts";
import { DeleteAccountCard } from "@/features/account/delete-account";

export const metadata: Metadata = { title: "הגדרות · Budgi" };

// DESIGN.md 1.10, areas 1–6
export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <>
      <PageHeader title="הגדרות" />
      <div className="flex max-w-3xl flex-col gap-6">
        <Suspense fallback={<CardSkeleton />}>
          <AccountCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton tall />}>
          <GoalsCard searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<CardSkeleton tall />}>
          <AlertsCard />
        </Suspense>
        <Card>
          <CardHeader>
            <CardTitle>מידע משפטי</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/terms" className="type-small font-medium text-primary underline-offset-4 hover:underline">
              תנאי שימוש
            </Link>
            <Link href="/privacy" className="type-small font-medium text-primary underline-offset-4 hover:underline">
              מדיניות פרטיות
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>יציאה</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                התנתקות
              </Button>
            </form>
          </CardContent>
        </Card>
        <DeleteAccountCard />
      </div>
    </>
  );
}

async function AccountCard() {
  const user = await requireOnboardedUser();
  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטי חשבון</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="type-small text-muted-foreground">שם</dt>
            <dd className="type-body" dir="auto">
              {user.displayName ?? "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="type-small text-muted-foreground">אימייל</dt>
            <dd className="type-body" dir="ltr" style={{ textAlign: "right" }}>
              {user.email ?? "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 type-small text-muted-foreground">השם והאימייל מגיעים מחשבון ההתחברות שלך (Google או אימייל).</p>
        <div className="mt-6 border-t border-brand-light-gray pt-6">
          <BusinessNameForm businessName={user.businessName} />
        </div>
      </CardContent>
    </Card>
  );
}

async function GoalsCard({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  await requireOnboardedUser();
  const { month: requested } = await searchParams;

  const thisMonth = currentMonth();
  const lastMonth = addMonths(thisMonth, 1);
  const firstMonth = (await getFirstGoalMonth()) ?? thisMonth;
  const options = monthsBetween(firstMonth < thisMonth ? firstMonth : thisMonth, lastMonth);

  const month =
    typeof requested === "string" && isMonth(requested) && options.includes(requested)
      ? requested
      : thisMonth;
  const goals = await getGoalsForMonth(month);

  return (
    <Card>
      <CardHeader>
        <CardTitle>יעדים</CardTitle>
      </CardHeader>
      <CardContent>
        <GoalsForm key={month} month={month} monthOptions={options} goals={goals} />
      </CardContent>
    </Card>
  );
}

async function AlertsCard() {
  await requireOnboardedUser();
  const settings = await getAlertSettings();
  return (
    <Card id="alerts" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>התראות</CardTitle>
      </CardHeader>
      <CardContent>
        <AlertSettingsForm settings={settings} />
      </CardContent>
    </Card>
  );
}

function CardSkeleton({ tall }: { tall?: boolean }) {
  return <Skeleton className={tall ? "h-96 w-full rounded-xl" : "h-40 w-full rounded-xl"} />;
}
