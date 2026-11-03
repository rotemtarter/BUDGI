import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format/numbers";

// Change against the previous period: arrow + percent, green when better and
// red when worse, so the meaning does not rely on color alone (DESIGN.md 2.3).
// For costs (CPL, CAC, Cost per Deal) a decrease is better.
export function ChangeIndicator({
  change,
  lowerIsBetter = false,
  className,
}: {
  change: number | null;
  lowerIsBetter?: boolean;
  className?: string;
}) {
  if (change === null) {
    return <span className={cn("type-caption text-muted-foreground", className)}>—</span>;
  }
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) {
    return (
      <span className={cn("type-caption text-muted-foreground", className)} dir="ltr">
        0%
      </span>
    );
  }
  const up = rounded > 0;
  const better = lowerIsBetter ? !up : up;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 type-caption font-medium", better ? "text-success" : "text-error", className)}
    >
      <Icon aria-hidden className="size-3.5" />
      <span dir="ltr">{formatPercent(Math.abs(rounded))}</span>
      <span className="sr-only">{up ? "עלייה" : "ירידה"}</span>
    </span>
  );
}
