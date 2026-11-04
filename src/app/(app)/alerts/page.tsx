import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BellOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AlertCard } from "@/components/alerts/alert-card";
import { AlertFilter } from "@/components/alerts/alert-filter";
import { formatAlertTime } from "@/lib/alerts/format";
import { requireOnboardedUser } from "@/server/auth/session";
import { listAlerts } from "@/server/repositories/alerts";

export const metadata: Metadata = { title: "התראות · Budgi" };

// Alert center (DESIGN.md 1.9), newest first
export default function AlertsPage({ searchParams }: PageProps<"/alerts">) {
  return (
    <>
      <PageHeader
        title="התראות"
        actions={
          <Link
            href="/settings#alerts"
            className="type-small font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            ניהול התראות
          </Link>
        }
      />
      <Suspense fallback={<AlertsSkeleton />}>
        {searchParams.then(({ filter }) => (
          <Alerts key={String(filter)} filter={filter === "unread" ? "unread" : "all"} />
        ))}
      </Suspense>
    </>
  );
}

async function Alerts({ filter }: { filter: "all" | "unread" }) {
  await requireOnboardedUser();
  const alerts = await listAlerts({ unreadOnly: filter === "unread" });
  const now = new Date();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <AlertFilter value={filter} />
      {alerts.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={filter === "unread" ? "אין התראות שלא נקראו" : "אין התראות. נעדכן כשמשהו ידרוש תשומת לב."}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <AlertCard alert={alert} time={formatAlertTime(alert.createdAt, now)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-3" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-9 w-48" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
