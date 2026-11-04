import { InfoPopover } from "@/components/common/info-popover";
import { formatDate } from "@/lib/dates/week";
import type { ForecastBasis as Basis } from "@/server/services/forecast";

export const BASIS_LABEL: Record<Basis, string> = {
  pace: "לפי קצב החודש",
  pace_and_history: "לפי קצב החודש וממוצע החודשים הקודמים",
};

// What the forecast is based on, and that it is an estimate (PRD 4.5, DESIGN.md 1.8)
export function ForecastBasis({
  basis,
  month,
  coveredDays,
  daysInMonth,
}: {
  basis: Basis;
  month: string;
  coveredDays: number;
  daysInMonth: number;
}) {
  const until = formatDate(`${month.slice(0, 8)}${String(coveredDays).padStart(2, "0")}`);
  return (
    <section
      aria-label="על מה מבוססת התחזית"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-brand-light-gray bg-accent/40 px-4 py-3 type-small text-brand-dark"
    >
      <span className="font-medium">התחזית {BASIS_LABEL[basis]}</span>
      {/* Dark text: gray is below 4.5:1 on this purple tint (axe) */}
      <span className="text-brand-dark/80">
        (נתונים עד <span dir="ltr">{until}</span>, {coveredDays} מתוך {daysInMonth} ימים).
      </span>
      <span>התחזית היא הערכה ולא הבטחה.</span>
      <InfoPopover label="איך מחושבת התחזית">
        <p>
          קצב החודש: הסכום עד כה ÷ מספר הימים שיש להם נתונים × מספר הימים בחודש.
        </p>
        <p className="mt-2">
          כשיש לפחות שני חודשים קודמים עם נתונים לכל השבועות: 70% מהקצב ועוד 30% מממוצע עד שלושת החודשים הקודמים.
        </p>
      </InfoPopover>
    </section>
  );
}
