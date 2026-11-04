import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatAlertTime } from "@/lib/alerts/format";
import { SEVERITY_LABELS } from "@/lib/alerts/types";
import { formatDate, today } from "@/lib/dates/week";
import type { SavedInsight } from "@/lib/advisor/schema";
import type { StoredAlert } from "@/server/repositories/alerts";
import { OverviewCard } from "./overview-card";

// Same status colors as the alert center (DESIGN.md 2.1, ADR-15)
const SEVERITY_BADGE: Record<StoredAlert["severity"], string> = {
  critical: "border-error/30 text-error",
  warning: "border-warning/30 text-warning",
  info: "border-success/30 text-success",
};

// The newest alerts on the home screen (DESIGN.md 1.3)
export function RecentAlerts({ alerts, now }: { alerts: StoredAlert[]; now: Date }) {
  return (
    <OverviewCard title="התראות אחרונות" id="recent-alerts-title" link={{ href: "/alerts", label: "לכל ההתראות" }}>
      {alerts.length === 0 ? (
        <p className="type-small text-muted-foreground">אין התראות.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-brand-light-gray">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                {alert.readAt === null && (
                  <span className="flex items-center">
                    <span aria-hidden className="size-2 rounded-full bg-primary" />
                    <span className="sr-only">לא נקראה</span>
                  </span>
                )}
                <span className="type-small font-semibold text-brand-dark">{alert.title}</span>
                <span
                  className={cn("rounded-full border bg-white px-2 py-0.5 type-caption font-medium", SEVERITY_BADGE[alert.severity])}
                >
                  {SEVERITY_LABELS[alert.severity]}
                </span>
              </div>
              <span className="type-caption text-muted-foreground">
                {alert.campaign && (
                  <>
                    <bdi>{alert.campaign.name}</bdi> ·{" "}
                  </>
                )}
                {formatAlertTime(alert.createdAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}

// The newest saved Advisor insights on the home screen (DESIGN.md 1.3)
export function RecentInsights({ insights }: { insights: SavedInsight[] }) {
  return (
    <OverviewCard title="תובנות AI שמורות" id="recent-insights-title" link={{ href: "/advisor", label: "לכל התובנות" }}>
      {insights.length === 0 ? (
        <p className="type-small text-muted-foreground">
          עוד לא נשמרו תובנות.{" "}
          <Link href="/advisor" className="font-medium text-primary underline-offset-4 hover:underline">
            לשאלה ל-AI Budget
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-brand-light-gray">
          {insights.map((insight) => (
            <li key={insight.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <span className="type-small font-semibold text-brand-dark" dir="auto">
                {insight.question}
              </span>
              <span className="line-clamp-2 type-small text-brand-dark/80" dir="auto">
                {insight.reply.answer}
              </span>
              <span className="type-caption text-muted-foreground">
                נשמרה ב-<bdi dir="ltr">{formatDate(today(new Date(insight.createdAt)))}</bdi>
              </span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
