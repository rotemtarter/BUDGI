"use client";

import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/campaigns/badges";
import { formatDate, formatWeekRange } from "@/lib/dates/week";
import type { PreviewSummary } from "@/lib/imports/types";
import { rowsLabel } from "@/lib/imports/labels";

const SHOWN_ADJUSTED = 10;

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "error" }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
      <span className="type-small text-muted-foreground">{label}</span>
      <span className={tone === "error" && value > 0 ? "type-h2 font-semibold text-error" : "type-h2 font-semibold text-brand-dark"}>
        {value.toLocaleString("he-IL")}
      </span>
    </div>
  );
}

// Step 3 (DESIGN.md 1.11): what will be saved, the new campaigns, the rows
// with errors and the dates moved to Sunday. Nothing is saved before "ייבוא".
export function ReviewStep({
  summary,
  autoMapped,
  onImport,
  onBack,
  pending,
}: {
  summary: PreviewSummary;
  autoMapped: boolean;
  onImport: () => void;
  onBack: () => void;
  pending: boolean;
}) {
  const importable = summary.newRows + summary.updatedRows;

  return (
    <div className="flex flex-col gap-6">
      {autoMapped && (
        <p role="status" className="flex items-center gap-2 type-body text-success">
          <CircleCheck aria-hidden className="size-5" />
          העמודות זוהו אוטומטית
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="שורות חדשות" value={summary.newRows} />
        <SummaryCard label="עדכונים לנתונים קיימים" value={summary.updatedRows} />
        <SummaryCard label="קמפיינים חדשים שייווצרו" value={summary.newCampaigns.length} />
        <SummaryCard label="שורות עם שגיאות" value={summary.errors.length} tone="error" />
      </div>

      {summary.newCampaigns.length > 0 && (
        <section aria-labelledby="new-campaigns" className="flex flex-col gap-3 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
          <h3 id="new-campaigns" className="type-h3">
            קמפיינים חדשים
          </h3>
          <p className="type-small text-muted-foreground">הקמפיינים האלה ייווצרו בסטטוס „פעיל”, רק אחרי שתאשר את הייבוא.</p>
          <ul className="flex flex-col gap-2">
            {summary.newCampaigns.map((c) => (
              <li key={`${c.name}|${c.platform}`} className="flex flex-wrap items-center gap-2">
                <span className="type-body font-medium" dir="auto">
                  {c.name}
                </span>
                <PlatformBadge platform={c.platform} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.adjusted.length > 0 && (
        <section aria-labelledby="adjusted-dates" className="flex flex-col gap-2 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
          <h3 id="adjusted-dates" className="type-h3">
            תאריכים שהותאמו
          </h3>
          <p className="type-small text-muted-foreground">
            {summary.adjusted.length === 1
              ? "בשורה אחת התאריך אינו יום ראשון, והשורה שויכה לשבוע שלו (ראשון–שבת)."
              : `ב-${summary.adjusted.length.toLocaleString("he-IL")} שורות התאריך אינו יום ראשון, וכל שורה שויכה לשבוע שלה (ראשון–שבת).`}
          </p>
          <ul className="flex flex-col gap-1 type-small">
            {summary.adjusted.slice(0, SHOWN_ADJUSTED).map((a) => (
              <li key={a.line}>
                שורה {a.line}: <span dir="ltr">{formatDate(a.date)}</span> ← שבוע <span dir="ltr">{formatWeekRange(a.weekStart)}</span>
              </li>
            ))}
          </ul>
          {summary.adjusted.length > SHOWN_ADJUSTED && (
            <p className="type-small text-muted-foreground">
              ועוד {rowsLabel(summary.adjusted.length - SHOWN_ADJUSTED)}
            </p>
          )}
        </section>
      )}

      {summary.errors.length > 0 && (
        <section aria-labelledby="row-errors" className="flex flex-col gap-3 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
          <h3 id="row-errors" className="type-h3">
            שורות עם שגיאות
          </h3>
          <p className="type-small text-muted-foreground">השורות האלה לא יישמרו. אפשר לתקן אותן בקובץ ולייבא אותו שוב.</p>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-right">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-brand-light-gray type-small text-muted-foreground">
                  <th scope="col" className="w-24 py-2 font-medium">
                    שורה
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    סיבה
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-gray type-small">
                {summary.errors.map((e) => (
                  <tr key={e.line}>
                    <td className="py-2 align-top">{e.line}</td>
                    <td className="py-2" dir="auto">
                      {e.reasons.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onImport} disabled={importable === 0 || pending}>
          {pending ? "מייבא…" : `ייבוא ${rowsLabel(importable)}`}
        </Button>
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          חזרה
        </Button>
        {importable === 0 && <p className="type-small text-muted-foreground">אין שורות תקינות לייבוא</p>}
      </div>
    </div>
  );
}
