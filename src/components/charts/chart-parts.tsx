import { formatMoney } from "@/lib/currency/format";
import { formatWeekRange } from "@/lib/dates/week";
import type { WeekPoint } from "@/server/services/metrics";
import { Amount } from "@/components/common/amount";

// Shared pieces of the weekly charts (DESIGN.md 2.4): revenue in Purple,
// spend in Indigo, told apart also by marker shape and a legend.
export const REVENUE_COLOR = "#6B3BFF";
export const SPEND_COLOR = "#A78BFA";
export const GRID_COLOR = "#E5E7EB";
export const AXIS_COLOR = "#6B7280";

// "25.10" — the week's Sunday
export function weekLabel(weekStart: string): string {
  const [, month, day] = weekStart.split("-");
  return `${day}.${month}`;
}

// "12K" on the Y axis; the ₪ sign is added by AmountTick
export function axisAmount(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}K`;
  return `${value}`;
}

// Y axis label "₪12K". Plus Jakarta Sans has no ₪ glyph, so the sign is drawn
// with Rubik (as in Amount).
export function AmountTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  if (x === undefined || y === undefined || !payload) return null;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={AXIS_COLOR} fontSize={12}>
      <tspan style={{ fontFamily: "var(--font-rubik)" }}>₪</tspan>
      <tspan>{axisAmount(payload.value)}</tspan>
    </text>
  );
}

// Dash pattern of the forecast lines (DESIGN.md 2.4)
export const FORECAST_DASH = "6 4";

// `forecast` adds the dashed "expected" line item (DESIGN.md 1.8)
export function ChartLegend({ bars, forecast }: { bars?: boolean; forecast?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-4 type-small text-brand-dark" aria-hidden>
      <li className="flex items-center gap-2">
        <span className={bars ? "size-3 rounded-sm" : "size-3 rounded-full"} style={{ background: REVENUE_COLOR }} />
        הכנסות
      </li>
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-sm" style={{ background: SPEND_COLOR }} />
        הוצאות
      </li>
      {forecast && (
        <li className="flex items-center gap-2">
          <svg width="24" height="4" aria-hidden>
            <line x1="0" y1="2" x2="24" y2="2" stroke={AXIS_COLOR} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          צפוי (מקווקו)
        </li>
      )}
    </ul>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: { payload: WeekPoint }[];
};

// Exact values for the hovered or tapped week
export function WeekTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div dir="rtl" className="flex flex-col gap-1 rounded-lg border border-brand-light-gray bg-white px-3 py-2 type-small shadow-card">
      <span className="font-medium text-brand-dark">
        שבוע <span dir="ltr">{formatWeekRange(point.weekStart)}</span>
      </span>
      <span style={{ color: REVENUE_COLOR }}>
        הכנסות: <Amount text={formatMoney(point.revenue, { whole: true })} />
      </span>
      <span className="text-brand-dark">
        הוצאות: <Amount text={formatMoney(point.spend, { whole: true })} />
      </span>
    </div>
  );
}

// Text alternative for screen readers: the chart's values as a table (DESIGN.md 2.5)
export function ChartTable({ caption, data }: { caption: string; data: WeekPoint[] }) {
  return (
    // sr-only on the wrapper: a table ignores the 1px width and would widen the page
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">שבוע</th>
            <th scope="col">הכנסות</th>
            <th scope="col">הוצאות</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.weekStart}>
              <th scope="row">{formatWeekRange(point.weekStart)}</th>
              <td>{formatMoney(point.revenue, { whole: true })}</td>
              <td>{formatMoney(point.spend, { whole: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
