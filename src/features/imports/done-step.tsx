import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CommitResult } from "@/lib/imports/types";
import { formatWeekRange } from "@/lib/dates/week";
import { campaignsLabel, rowsLabel } from "@/lib/imports/labels";

const n = (value: number) => value.toLocaleString("he-IL");

// Step 4 (DESIGN.md 1.11): what was saved and what was rejected. After an
// import into one campaign: the week that was saved, and the way back to it.
export function DoneStep({
  result,
  onAnother,
  campaign,
}: {
  result: CommitResult;
  onAnother: () => void;
  campaign?: { id: string; name: string; weekStart: string };
}) {
  if (campaign) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-brand-light-gray bg-white px-6 py-12 text-center shadow-card">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/10">
          <CircleCheck aria-hidden className="size-8 text-success" />
        </span>
        <p className="type-h3">הנתונים נשמרו</p>
        <p className="type-body">
          {result.rowsImported > 1 ? (
            // A full month, split into its weeks (ADR-16)
            <>נשמרו {result.rowsImported} שבועות של החודש בקמפיין </>
          ) : (
            <>
              {result.rowsUpdated > 0 ? "עודכן" : "נוסף"} שבוע <span dir="ltr">{formatWeekRange(campaign.weekStart)}</span> בקמפיין{" "}
            </>
          )}
          <bdi className="font-medium">{campaign.name}</bdi>
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/campaigns/${campaign.id}`} className={buttonVariants()}>
            חזרה לקמפיין
          </Link>
          <Button variant="secondary" onClick={onAnother}>
            ייבוא קובץ נוסף
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-brand-light-gray bg-white px-6 py-12 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-full bg-success/10">
        <CircleCheck aria-hidden className="size-8 text-success" />
      </span>
      <p className="type-h3">הייבוא הושלם</p>
      <ul className="flex flex-col gap-1 type-body">
        <li>
          נשמרו {rowsLabel(result.rowsImported)} ({n(result.rowsInserted)} חדשות, {n(result.rowsUpdated)} עדכונים)
        </li>
        <li>{result.campaignsCreated === 0 ? "לא נוצרו קמפיינים חדשים" : `נוצרו ${campaignsLabel(result.campaignsCreated)}`}</li>
        <li className={result.rowsRejected > 0 ? "text-error" : undefined}>
          {result.rowsRejected === 0 ? "לא היו שורות עם שגיאות" : `${rowsLabel(result.rowsRejected)} עם שגיאות לא נשמרו`}
        </li>
      </ul>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/campaigns" className={buttonVariants()}>
          מעבר לקמפיינים
        </Link>
        <Button variant="secondary" onClick={onAnother}>
          ייבוא קובץ נוסף
        </Button>
      </div>
    </div>
  );
}
