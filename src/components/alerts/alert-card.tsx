"use client";

import { useTransition } from "react";
import { Gauge, OctagonAlert, Target, TrendingDown, Trophy, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/campaigns/badges";
import { SEVERITY_LABELS, type AlertSeverity, type AlertType } from "@/lib/alerts/types";
import type { StoredAlert } from "@/server/repositories/alerts";
import { openAlertAction } from "@/features/alerts/actions";

const ICONS: Record<AlertType, LucideIcon> = {
  spend_pace: Gauge,
  budget_overrun: OctagonAlert,
  performance_drop: TrendingDown,
  goal_risk: Target,
  goal_reached: Trophy,
};

// Status colors (DESIGN.md 2.1); the severity is also written out in text
const SEVERITY_STYLES: Record<AlertSeverity, { icon: string; badge: string }> = {
  critical: { icon: "bg-error/10 text-error", badge: "bg-error/10 text-error" },
  warning: { icon: "bg-warning/10 text-warning", badge: "bg-warning/10 text-warning" },
  info: { icon: "bg-success/10 text-success", badge: "bg-success/10 text-success" },
};

// One alert in the alert center (DESIGN.md 1.9). A click marks it as read and
// opens its context.
export function AlertCard({ alert, time }: { alert: StoredAlert; time: string }) {
  const [pending, startTransition] = useTransition();
  const Icon = ICONS[alert.type];
  const styles = SEVERITY_STYLES[alert.severity];
  const unread = alert.readAt === null;

  function open() {
    startTransition(async () => {
      const result = await openAlertAction(alert.id);
      if (result && !result.ok) toast.error(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      aria-busy={pending || undefined}
      data-testid="alert-card"
      data-unread={unread || undefined}
      className={cn(
        "flex w-full items-start gap-4 rounded-xl border p-4 text-start shadow-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:p-5",
        unread ? "border-primary/20 bg-accent" : "border-brand-light-gray bg-white hover:bg-accent/50",
      )}
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", styles.icon)}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          {unread && (
            <span className="flex items-center">
              <span aria-hidden className="size-2 rounded-full bg-primary" />
              <span className="sr-only">לא נקראה</span>
            </span>
          )}
          <span className="type-body font-semibold text-brand-dark">{alert.title}</span>
          <span className={cn("rounded-full px-2 py-0.5 type-caption font-medium", styles.badge)}>
            {SEVERITY_LABELS[alert.severity]}
          </span>
        </span>
        <span className="type-small text-brand-dark">{alert.description}</span>
        {alert.campaign && (
          <span className="flex flex-wrap items-center gap-2 type-small text-muted-foreground">
            <span dir="auto">{alert.campaign.name}</span>
            <PlatformBadge platform={alert.campaign.platform} />
          </span>
        )}
        <span className="type-caption text-muted-foreground">{time}</span>
      </span>
    </button>
  );
}
