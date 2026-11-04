import { formatPercent } from "@/lib/format/numbers";

const SIZE = 56;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// How much of the month's budget was used (DESIGN.md 1.3, ADR-20): a ring in
// the brand purple, all red when the budget is exceeded. The percentage is
// also written out, so the ring is not the only cue.
export function BudgetDonut({ planned, spend }: { planned: number | null; spend: number | null }) {
  if (planned === null || planned <= 0 || spend === null) return null;
  const used = (spend / planned) * 100;
  const over = used > 100;
  const filled = Math.min(used, 100) / 100;

  return (
    <span className="flex items-center gap-3">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="shrink-0 -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-brand-light-gray)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={over ? "var(--color-error)" : "var(--color-brand-purple)"}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      <span className={over ? "type-small font-medium text-error" : "type-small text-muted-foreground"}>
        {over ? (
          <>
            חריגה: נוצלו <span dir="ltr">{formatPercent(used)}</span> מהתקציב
          </>
        ) : (
          <>
            נוצלו <span dir="ltr">{formatPercent(used)}</span> מהתקציב
          </>
        )}
      </span>
    </span>
  );
}
