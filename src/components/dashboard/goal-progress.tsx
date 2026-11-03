import Link from "next/link";
import { Amount } from "@/components/common/amount";
import { formatMoney } from "@/lib/currency/format";
import { formatPercent } from "@/lib/format/numbers";

// Progress to the monthly revenue goal (DESIGN.md 1.3): actual out of target, in percent
export function GoalProgress({
  actual,
  target,
  progress,
}: {
  actual: number | null;
  target: number | null;
  progress: number | null;
}) {
  return (
    <section aria-labelledby="goal-title" className="flex flex-col gap-3 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="goal-title" className="type-h4">
          התקדמות ליעד ההכנסות
        </h2>
        {target !== null && target > 0 && (
          <span className="type-small text-muted-foreground">
            <Amount text={formatMoney(actual ?? 0, { whole: true })} /> מתוך <Amount text={formatMoney(target)} />
            {progress !== null && (
              <>
                {" "}
                (<span dir="ltr">{formatPercent(progress)}</span>)
              </>
            )}
          </span>
        )}
      </div>
      {target === null || target === 0 ? (
        <p className="type-small text-muted-foreground">
          לא הוגדר יעד הכנסות לחודש הזה.{" "}
          <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
            הגדרת יעדים
          </Link>
        </p>
      ) : (
        <div
          role="progressbar"
          aria-labelledby="goal-title"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(progress ?? 0))}
          aria-valuetext={progress === null ? "לא הוזנו הכנסות" : `${formatPercent(progress)} מהיעד`}
          className="h-3 overflow-hidden rounded-full bg-brand-light-gray"
        >
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand-purple to-brand-indigo"
            style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }}
          />
        </div>
      )}
    </section>
  );
}
