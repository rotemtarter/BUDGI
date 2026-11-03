"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekPoint } from "@/server/services/metrics";
import {
  AXIS_COLOR,
  ChartLegend,
  ChartTable,
  GRID_COLOR,
  REVENUE_COLOR,
  SPEND_COLOR,
  WeekTooltip,
  AmountTick,
  weekLabel,
} from "./chart-parts";

const HEIGHT = 280;

// Revenue and spend per week (DESIGN.md 1.3 as lines, 1.7 as bars). One point
// per week; a week without data is a gap, not zero (DESIGN.md 2.4). Time runs
// left to right, so the plot itself is LTR inside the RTL page.
export function RevenueSpendChart({
  title,
  data,
  variant,
}: {
  title: string;
  data: WeekPoint[];
  variant: "line" | "bar";
}) {
  const axes = (
    <>
      <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
      <XAxis
        dataKey="weekStart"
        tickFormatter={weekLabel}
        tick={{ fill: AXIS_COLOR, fontSize: 12 }}
        tickLine={false}
        axisLine={{ stroke: GRID_COLOR }}
      />
      <YAxis
        tick={<AmountTick />}
        tickLine={false}
        axisLine={false}
        width={56}
      />
      <Tooltip content={<WeekTooltip />} cursor={{ fill: "rgba(107, 59, 255, 0.06)", stroke: GRID_COLOR }} />
    </>
  );

  return (
    <section
      aria-labelledby={`${variant}-chart-title`}
      className="flex flex-col gap-4 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${variant}-chart-title`} className="type-h4">
          {title}
        </h2>
        <ChartLegend bars={variant === "bar"} />
      </div>
      <div dir="ltr" role="img" aria-label={`${title}: גרף שבועי של הכנסות והוצאות. הערכים מופיעים בטבלה שאחריו.`}>
        <ResponsiveContainer width="100%" height={HEIGHT}>
          {variant === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              {axes}
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
                dot={<SquareDot />}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
              {axes}
              <Bar dataKey="spend" name="הוצאות" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="revenue" name="הכנסות" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <ChartTable caption={title} data={data} />
    </section>
  );
}

// Square marker for the spend line, so the two lines differ by more than color
function SquareDot({ cx, cy, value }: { cx?: number; cy?: number; value?: number | null }) {
  if (cx === undefined || cy === undefined || value === null || value === undefined) return null;
  return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={SPEND_COLOR} />;
}
