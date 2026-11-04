"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/currency/format";
import { formatWeekRange } from "@/lib/dates/week";
import type { ForecastPoint } from "@/server/services/forecast";
import { Amount } from "@/components/common/amount";
import {
  AXIS_COLOR,
  AmountTick,
  ChartLegend,
  FORECAST_DASH,
  GRID_COLOR,
  REVENUE_COLOR,
  SPEND_COLOR,
  weekLabel,
} from "./chart-parts";

const HEIGHT = 280;

// Revenue and spend per week of the month (DESIGN.md 1.8): a solid line for
// weeks with data and a dashed line for the expected rest of the month. For
// an ended month (`forecast` false) only the solid lines.
export function ForecastChart({ title, data, forecast }: { title: string; data: ForecastPoint[]; forecast: boolean }) {
  return (
    <section
      aria-labelledby="forecast-chart-title"
      className="flex flex-col gap-4 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="forecast-chart-title" className="type-h4">
          {title}
        </h2>
        <ChartLegend forecast={forecast} />
      </div>
      <div
        dir="ltr"
        role="img"
        aria-label={`${title}: גרף שבועי של הכנסות והוצאות${forecast ? ", כולל ההמשך הצפוי עד סוף החודש" : ""}. הערכים מופיעים בטבלה שאחריו.`}
      >
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="weekStart"
              tickFormatter={weekLabel}
              tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
            />
            <YAxis tick={<AmountTick />} tickLine={false} axisLine={false} width={56} />
            <Tooltip content={<ForecastTooltip />} cursor={{ stroke: GRID_COLOR }} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="הכנסות"
              stroke={REVENUE_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4, fill: REVENUE_COLOR }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="spend"
              name="הוצאות"
              stroke={SPEND_COLOR}
              strokeWidth={2.5}
              dot={<SquareDot color={SPEND_COLOR} />}
              connectNulls={false}
              isAnimationActive={false}
            />
            {forecast && (
              <>
                <Line
                  type="monotone"
                  dataKey="revenueForecast"
                  name="הכנסות צפויות"
                  stroke={REVENUE_COLOR}
                  strokeWidth={2}
                  strokeDasharray={FORECAST_DASH}
                  dot={{ r: 3, fill: "#fff", stroke: REVENUE_COLOR, strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="spendForecast"
                  name="הוצאות צפויות"
                  stroke={SPEND_COLOR}
                  strokeWidth={2}
                  strokeDasharray={FORECAST_DASH}
                  dot={<SquareDot color={SPEND_COLOR} hollow />}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ForecastTable caption={title} data={data} forecast={forecast} />
    </section>
  );
}

// A week after the last week with data shows its expected value
const isExpected = (actual: number | null, expected: number | null) => actual === null && expected !== null;

function ForecastTooltip({ active, payload }: { active?: boolean; payload?: { payload: ForecastPoint }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const revenueExpected = isExpected(point.revenue, point.revenueForecast);
  const spendExpected = isExpected(point.spend, point.spendForecast);
  return (
    <div dir="rtl" className="flex flex-col gap-1 rounded-lg border border-brand-light-gray bg-white px-3 py-2 type-small shadow-card">
      <span className="font-medium text-brand-dark">
        שבוע <span dir="ltr">{formatWeekRange(point.weekStart)}</span>
      </span>
      <span style={{ color: REVENUE_COLOR }}>
        {revenueExpected ? "הכנסות צפויות" : "הכנסות"}:{" "}
        <Amount text={formatMoney(revenueExpected ? point.revenueForecast : point.revenue, { whole: true })} />
      </span>
      <span className="text-brand-dark">
        {spendExpected ? "הוצאות צפויות" : "הוצאות"}:{" "}
        <Amount text={formatMoney(spendExpected ? point.spendForecast : point.spend, { whole: true })} />
      </span>
    </div>
  );
}

// Text alternative for screen readers (DESIGN.md 2.5)
function ForecastTable({ caption, data, forecast }: { caption: string; data: ForecastPoint[]; forecast: boolean }) {
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
            {forecast && <th scope="col">הכנסות צפויות</th>}
            {forecast && <th scope="col">הוצאות צפויות</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.weekStart}>
              <th scope="row">{formatWeekRange(point.weekStart)}</th>
              <td>{formatMoney(point.revenue, { whole: true })}</td>
              <td>{formatMoney(point.spend, { whole: true })}</td>
              {forecast && <td>{formatMoney(isExpected(point.revenue, point.revenueForecast) ? point.revenueForecast : null, { whole: true })}</td>}
              {forecast && <td>{formatMoney(isExpected(point.spend, point.spendForecast) ? point.spendForecast : null, { whole: true })}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Square marker for the spend lines, so they differ from revenue by more than color
function SquareDot({
  cx,
  cy,
  value,
  color,
  hollow,
}: {
  cx?: number;
  cy?: number;
  value?: number | null;
  color: string;
  hollow?: boolean;
}) {
  if (cx === undefined || cy === undefined || value === null || value === undefined) return null;
  return hollow ? (
    <rect x={cx - 3} y={cy - 3} width={6} height={6} fill="#fff" stroke={color} strokeWidth={2} />
  ) : (
    <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={color} />
  );
}
