import { currentMonth } from "@/lib/dates/month";
import { today } from "@/lib/dates/week";
import { formatPeriodLabel, isSamePeriod, previousPeriod, type Period } from "@/lib/dates/period";
import { getFirstMonth } from "@/server/services/dashboard";
import { CompareSelector, PeriodSelector } from "./period-selector";

// Period picker with the range of months the user can choose from, and on
// the metrics screen also the "compare to" picker
export async function PeriodHeader({ path, period, compare }: { path: string; period: Period; compare?: Period }) {
  const firstMonth = await getFirstMonth();
  const range = { firstMonth, lastMonth: currentMonth(), today: today() };
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <PeriodSelector path={path} period={period} {...range} />
      {compare && <CompareSelector path={path} period={period} compare={compare} {...range} />}
    </div>
  );
}

// "מול החודש הקודם", or "מול ספטמבר 2025" for a picked period
export function compareLabel(period: Period, compare: Period = previousPeriod(period)): string {
  if (isSamePeriod(compare, previousPeriod(period))) {
    return period.kind === "month" ? "מול החודש הקודם" : "מול השבוע הקודם";
  }
  return `מול ${compareName(compare)}`;
}

// "ספטמבר 2025" / "שבוע 21.09–27.09"
export function compareName(compare: Period): string {
  return compare.kind === "month" ? formatPeriodLabel(compare) : `שבוע ${formatPeriodLabel(compare)}`;
}
