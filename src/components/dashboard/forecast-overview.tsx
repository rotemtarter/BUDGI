import { Amount } from "@/components/common/amount";
import { formatMoney } from "@/lib/currency/format";
import { formatPercent } from "@/lib/format/numbers";
import { NOT_ENOUGH_DATA } from "@/server/services/forecast";
import type { HomeForecast } from "@/server/services/dashboard";
import { OverviewCard } from "./overview-card";

// Month-end forecast on the home screen (DESIGN.md 1.3), current month only.
// The full forecast, with its basis, is on the forecast screen (1.8).
export function ForecastOverview({ forecast }: { forecast: HomeForecast }) {
  return (
    <OverviewCard title="תחזית לסוף החודש" id="forecast-title" link={{ href: "/forecast", label: "לתחזית המלאה" }}>
      {!forecast.enough ? (
        <p className="type-small text-muted-foreground">
          {NOT_ENOUGH_DATA}: צריך נתונים של שבוע אחד לפחות בחודש.
        </p>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item
              label="הוצאות צפויות"
              value={forecast.spend}
              compare={forecast.budget === null ? "תקציב: לא הוגדר" : <>תקציב: <Amount text={formatMoney(forecast.budget, { whole: true })} /></>}
              over={forecast.spend !== null && forecast.budget !== null && forecast.spend > forecast.budget}
            />
            <Item
              label="הכנסות צפויות"
              value={forecast.revenue}
              compare={
                forecast.revenueGoal === null ? (
                  "יעד: לא הוגדר"
                ) : (
                  <>
                    יעד: <Amount text={formatMoney(forecast.revenueGoal, { whole: true })} />
                    {forecast.revenueProgress !== null && (
                      <>
                        {" "}
                        (<span dir="ltr">{formatPercent(forecast.revenueProgress)}</span> מהיעד)
                      </>
                    )}
                  </>
                )
              }
            />
          </dl>
          <p className="type-caption text-muted-foreground">התחזית היא הערכה לפי הקצב עד כה, ולא הבטחה.</p>
        </>
      )}
    </OverviewCard>
  );
}

function Item({
  label,
  value,
  compare,
  over,
}: {
  label: string;
  value: number | null;
  compare: React.ReactNode;
  over?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-small text-muted-foreground">{label}</dt>
      <dd className="type-h3 font-semibold text-brand-dark" style={{ textAlign: "right" }}>
        <Amount text={formatMoney(value, { whole: true })} />
      </dd>
      <dd className={over ? "type-small font-medium text-error" : "type-small text-muted-foreground"}>
        {compare}
        {over && " · צפויה חריגה מהתקציב"}
      </dd>
    </div>
  );
}
