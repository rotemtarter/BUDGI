import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChangeIndicator } from "./change-indicator";

// KPI card: label, main value and change against the previous period
// (DESIGN.md 2.3). `size="sm"` is the smaller version used on campaign details.
export function KpiCard({
  label,
  value,
  change,
  lowerIsBetter,
  note,
  size = "default",
}: {
  label: string;
  value: ReactNode;
  change?: number | null;
  lowerIsBetter?: boolean;
  note?: string;
  size?: "default" | "sm";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
      <span className="type-small text-muted-foreground" dir="auto">
        {label}
      </span>
      <span className={cn(size === "sm" ? "type-h3" : "type-h2", "font-semibold text-brand-dark")} dir="ltr" style={{ textAlign: "right" }}>
        {value}
      </span>
      {change !== undefined && (
        <span className="flex flex-wrap items-center gap-1 type-caption text-muted-foreground">
          <ChangeIndicator change={change} lowerIsBetter={lowerIsBetter} />
          <span>מול החודש הקודם</span>
        </span>
      )}
      {note && <span className="type-caption text-muted-foreground">{note}</span>}
    </div>
  );
}
