"use client";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency/format";
import { formatCount } from "@/lib/format/numbers";
import { formatWeekRange } from "@/lib/dates/week";
import { FIELD_LABELS, VALUE_FIELDS, type ValueField } from "@/lib/imports/fields";
import { rowsLabel } from "@/lib/imports/labels";
import type { CampaignPreview } from "@/lib/imports/types";

const MONEY: readonly ValueField[] = ["spend", "revenue"];
const format = (field: ValueField, value: number | null) =>
  MONEY.includes(field) ? formatMoney(value) : formatCount(value);

// Step 3 of an import into one campaign: the file's totals for the week, next
// to what is stored now. An empty total keeps the stored value.
export function CampaignReviewStep({
  campaignName,
  summary,
  onImport,
  onBack,
  pending,
}: {
  campaignName: string;
  summary: CampaignPreview;
  onImport: () => void;
  onBack: () => void;
  pending: boolean;
}) {
  const { existing, totals } = summary;
  const blocked = summary.errors.length > 0 || summary.rowsSummed === 0;

  return (
    <div className="flex flex-col gap-6">
      <p className="type-body">
        {rowsLabel(summary.rowsSummed)} מהקובץ יחוברו לשבוע <span dir="ltr">{formatWeekRange(summary.weekStart)}</span> בקמפיין{" "}
        <bdi className="font-medium">{campaignName}</bdi>.
        {summary.crossesWeeks && " הטווח עובר בין שני שבועות, והנתונים נשמרים לשבוע שבו רוב הימים."}
      </p>
      {existing && (
        <p role="status" className="type-small text-warning">
          לשבוע הזה כבר יש נתונים. הערכים מהקובץ יחליפו אותם; שדה שאין לו ערך בקובץ יישאר כמו שהוא.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-light-gray bg-white shadow-card">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-brand-light-gray type-small text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">שדה</th>
              <th scope="col" className="px-4 py-3 font-medium">סה״כ בקובץ</th>
              {existing && <th scope="col" className="px-4 py-3 font-medium">שמור עכשיו</th>}
              <th scope="col" className="px-4 py-3 font-medium">יישמר</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-light-gray type-small">
            {VALUE_FIELDS.map((field) => {
              const saved = totals[field] ?? existing?.[field] ?? null;
              return (
                <tr key={field}>
                  <th scope="row" className="px-4 py-3 text-start font-medium">{FIELD_LABELS[field]}</th>
                  <td className="px-4 py-3" dir="ltr" style={{ textAlign: "right" }}>{format(field, totals[field])}</td>
                  {existing && <td className="px-4 py-3" dir="ltr" style={{ textAlign: "right" }}>{format(field, existing[field])}</td>}
                  <td className="px-4 py-3 font-semibold" dir="ltr" style={{ textAlign: "right" }}>{format(field, saved)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {summary.rowsSkipped > 0 && (
        <p className="type-small text-muted-foreground">{rowsLabel(summary.rowsSkipped)} בלי ערכים דולגו.</p>
      )}

      {summary.errors.length > 0 && (
        <section aria-labelledby="campaign-row-errors" className="flex flex-col gap-3 rounded-xl border border-error/40 bg-white p-4 shadow-card">
          <h3 id="campaign-row-errors" className="type-h3">שורות עם שגיאות</h3>
          <p className="type-small text-muted-foreground">
            כדי שהסיכום יהיה נכון, אי אפשר לשמור כשיש שורות שגויות. יש לתקן אותן בקובץ ולהעלות אותו שוב.
          </p>
          <ul className="flex flex-col gap-1 type-small">
            {summary.errors.map((e) => (
              <li key={e.line}>
                שורה {e.line}: <span dir="auto">{e.reasons.join("; ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onImport} disabled={blocked || pending}>
          {pending ? "שומר…" : "שמירה לקמפיין"}
        </Button>
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          חזרה
        </Button>
        {summary.rowsSummed === 0 && summary.errors.length === 0 && (
          <p className="type-small text-muted-foreground">אין בקובץ ערכים לייבוא</p>
        )}
      </div>
    </div>
  );
}
