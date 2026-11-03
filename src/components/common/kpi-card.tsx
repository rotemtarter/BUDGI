import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChangeIndicator } from "./change-indicator";
import { InfoPopover } from "./info-popover";

// KPI card: label, main value and change against the previous period
// (DESIGN.md 2.3). `size="sm"` is the smaller version used on campaign details.
// When the value cannot be calculated, `unavailableReason` replaces it with
// "לא זמין" and a short explanation (PRD 4.8).
export function KpiCard({
  label,
  value,
  change,
  lowerIsBetter,
  compareLabel = "מול החודש הקודם",
  note,
  compareValue,
  info,
  unavailableReason,
  href,
  size = "default",
}: {
  label: string;
  value: ReactNode;
  change?: number | null;
  lowerIsBetter?: boolean;
  compareLabel?: string;
  note?: string;
  // The comparison period's value, e.g. "ספטמבר 2025: ₪45"
  compareValue?: ReactNode;
  // Explanation behind an info icon, e.g. the formula
  info?: ReactNode;
  unavailableReason?: string | null;
  // Makes the whole card a link
  href?: string;
  size?: "default" | "sm";
}) {
  const content = (
    <>
      <span className="flex items-center gap-1 type-small text-muted-foreground">
        <span dir="auto">{label}</span>
        {info && <InfoPopover label={`הסבר על ${label}`}>{info}</InfoPopover>}
      </span>
      {unavailableReason ? (
        <span className="flex flex-col gap-1">
          <span className={cn(size === "sm" ? "type-h4" : "type-h3", "font-semibold text-muted-foreground")}>לא זמין</span>
          <span className="type-caption text-muted-foreground">{unavailableReason}</span>
        </span>
      ) : (
        <span
          className={cn(size === "sm" ? "type-h3" : "type-h2", "font-semibold text-brand-dark")}
          dir="ltr"
          style={{ textAlign: "right" }}
        >
          {value}
        </span>
      )}
      {change !== undefined && !unavailableReason && (
        <span className="flex flex-wrap items-center gap-1 type-caption text-muted-foreground">
          <ChangeIndicator change={change} lowerIsBetter={lowerIsBetter} />
          <span>{compareLabel}</span>
        </span>
      )}
      {compareValue && <span className="type-caption text-muted-foreground">{compareValue}</span>}
      {note && <span className="type-caption text-muted-foreground">{note}</span>}
    </>
  );

  const className = "flex flex-col gap-2 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(className, "outline-none transition-colors hover:border-brand-indigo focus-visible:ring-2 focus-visible:ring-ring")}
      >
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
