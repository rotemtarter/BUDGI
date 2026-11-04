import Link from "next/link";
import { Amount } from "@/components/common/amount";
import { formatMoney } from "@/lib/currency/format";
import { formatCount, formatPercent, formatRoas } from "@/lib/format/numbers";
import type { HomeGoal } from "@/server/services/dashboard";
import { OverviewCard } from "./overview-card";

const GOALS: Record<HomeGoal["goal"], { label: string; aria: string; format: (value: number | null) => React.ReactNode }> = {
  revenue: {
    label: "הכנסות",
    aria: "התקדמות ליעד ההכנסות",
    format: (value) => <Amount text={formatMoney(value, { whole: true })} />,
  },
  deals: { label: "עסקאות", aria: "התקדמות ליעד העסקאות", format: (value) => <span dir="ltr">{formatCount(value)}</span> },
  leads: { label: "לידים", aria: "התקדמות ליעד הלידים", format: (value) => <span dir="ltr">{formatCount(value)}</span> },
  min_roas: { label: "ROAS מינימלי", aria: "ROAS מול המינימום", format: (value) => <span dir="ltr">{formatRoas(value)}</span> },
};

// Progress to each goal set for the month (DESIGN.md 1.3): actual out of the
// target, with a bar. Minimum ROAS compares the actual ROAS with the minimum.
export function GoalsOverview({ goals }: { goals: HomeGoal[] }) {
  return (
    <OverviewCard title="התקדמות ליעדים" id="goals-title" link={{ href: "/settings", label: "עריכת יעדים" }}>
      {goals.length === 0 ? (
        <p className="type-small text-muted-foreground">
          לא הוגדרו יעדים לחודש הזה.{" "}
          <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
            הגדרת יעדים
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {goals.map((item) => {
            const goal = GOALS[item.goal];
            const id = `goal-${item.goal}`;
            return (
              <li key={item.goal} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span id={id} className="type-small font-medium text-brand-dark">
                    {goal.label}
                  </span>
                  <span className="type-small text-muted-foreground">
                    {goal.format(item.actual)} מתוך {goal.format(item.target)}
                    {item.progress !== null && (
                      <>
                        {" "}
                        (<span dir="ltr">{formatPercent(item.progress)}</span>)
                      </>
                    )}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={goal.aria}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(item.progress ?? 0))}
                  aria-valuetext={item.progress === null ? "לא הוזנו נתונים" : `${formatPercent(item.progress)} מהיעד`}
                  className="h-2.5 overflow-hidden rounded-full bg-brand-light-gray"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-brand-purple to-brand-indigo"
                    style={{ width: `${Math.min(100, Math.max(0, item.progress ?? 0))}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </OverviewCard>
  );
}
