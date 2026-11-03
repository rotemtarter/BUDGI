"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SourceBadge } from "@/components/campaigns/badges";
import { Amount } from "@/components/common/amount";
import { formatMoney } from "@/lib/currency/format";
import { formatCount } from "@/lib/format/numbers";
import { formatWeekRange, today } from "@/lib/dates/week";
import type { CampaignWeek } from "@/server/repositories/performance";
import { WeekDialog } from "./week-dialog";
import { deleteWeekAction } from "./actions";

const TH = "px-4 py-3 text-start type-small font-medium text-muted-foreground whitespace-nowrap";
const TD = "px-4 py-3 type-small whitespace-nowrap";

// "נתונים שבועיים" on campaign details (DESIGN.md 1.5): latest week first,
// "—" for a field that was not entered
export function WeeksSection({ campaignId, weeks }: { campaignId: string; weeks: CampaignWeek[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; date: string }>({ open: false, date: "" });
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const openFor = (date: string) => setDialog({ open: true, date });

  const confirmDelete = () => {
    if (!toDelete) return;
    startDelete(async () => {
      const result = await deleteWeekAction(campaignId, toDelete);
      if (result.ok) {
        toast.success("השבוע נמחק");
        setToDelete(null);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <section aria-labelledby="weeks-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="weeks-title" className="type-h3">
          נתונים שבועיים
        </h2>
        {weeks.length > 0 && <Button onClick={() => openFor(today())}>הוספת שבוע</Button>}
      </div>

      {weeks.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="עוד לא הוזנו נתונים לקמפיין הזה"
          description="הזן את נתוני הביצועים של שבוע אחד — הוצאה, לידים, עסקאות, לקוחות חדשים או הכנסות."
          actions={<Button onClick={() => openFor(today())}>הוספת שבוע</Button>}
        />
      ) : (
        <div
          // relative: keeps the sr-only header inside the scroll box, so the page does not scroll sideways
          className="relative overflow-x-auto rounded-xl border border-brand-light-gray bg-white shadow-card">
          <table className="w-full border-collapse">
            <thead className="border-b border-brand-light-gray">
              <tr>
                <th scope="col" className={TH}>שבוע</th>
                <th scope="col" className={TH}>הוצאה</th>
                <th scope="col" className={TH}>לידים</th>
                <th scope="col" className={TH}>עסקאות</th>
                <th scope="col" className={TH}>לקוחות חדשים</th>
                <th scope="col" className={TH}>הכנסות</th>
                <th scope="col" className={TH}>מקור</th>
                <th scope="col" className={TH}>
                  <span className="sr-only">פעולות</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => {
                const range = formatWeekRange(week.week_start);
                return (
                  <tr key={week.week_start} className="border-b border-brand-light-gray last:border-0">
                    <th scope="row" className={`${TD} text-start font-medium text-brand-dark`} dir="ltr" style={{ textAlign: "right" }}>
                      {range}
                    </th>
                    <Num>{<Amount text={formatMoney(week.spend)} />}</Num>
                    <Num>{formatCount(week.leads)}</Num>
                    <Num>{formatCount(week.deals)}</Num>
                    <Num>{formatCount(week.new_customers)}</Num>
                    <Num>{<Amount text={formatMoney(week.revenue)} />}</Num>
                    <td className={TD}>
                      <SourceBadge source={week.source} />
                    </td>
                    <td className={TD}>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`עריכת שבוע ${range}`} onClick={() => openFor(week.week_start)}>
                          <Pencil aria-hidden className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`מחיקת שבוע ${range}`} onClick={() => setToDelete(week.week_start)}>
                          <Trash2 aria-hidden className="text-error" />
                        </Button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <WeekDialog
        campaignId={campaignId}
        weeks={weeks}
        open={dialog.open}
        date={dialog.date}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="מחיקת שבוע"
        description={toDelete ? `למחוק את נתוני השבוע ${formatWeekRange(toDelete)}? אי אפשר לבטל את הפעולה.` : ""}
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function Num({ children }: { children: ReactNode }) {
  return (
    <td className={TD} dir="ltr" style={{ textAlign: "right" }}>
      {children}
    </td>
  );
}
