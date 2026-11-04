"use client";

import { useState, useTransition } from "react";
import { Bookmark, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ReplyBody } from "@/components/advisor/advisor-reply";
import { ADVISOR_MESSAGES } from "@/lib/advisor/messages";
import type { SavedInsight } from "@/lib/advisor/schema";
import { formatDate, today } from "@/lib/dates/week";
import { deleteInsightAction } from "./actions";

// "תובנות שמורות" (PRD 4.7, DESIGN.md 1.12): answers the user chose to keep,
// newest first. Collapsed by default; hidden while there are none.
export function SavedInsights({
  insights,
  onDeleted,
}: {
  insights: SavedInsight[];
  onDeleted: (id: string) => void;
}) {
  const [toDelete, setToDelete] = useState<SavedInsight | null>(null);
  const [deleting, startDelete] = useTransition();

  if (insights.length === 0) return null;

  const confirmDelete = () => {
    if (!toDelete) return;
    startDelete(async () => {
      const result = await deleteInsightAction(toDelete.id);
      if (result.ok) {
        toast.success(ADVISOR_MESSAGES.deletedToast);
        onDeleted(toDelete.id);
        setToDelete(null);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <details className="group mb-6 rounded-xl border border-brand-light-gray bg-white shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 type-h4">
          <Bookmark aria-hidden className="size-5 text-primary" />
          {`${ADVISOR_MESSAGES.savedInsights} (${insights.length})`}
        </span>
        <ChevronDown aria-hidden className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="flex flex-col gap-3 border-t border-brand-light-gray p-4" aria-label={ADVISOR_MESSAGES.savedInsights}>
        {insights.map((insight) => (
          <li key={insight.id}>
            <article
              className="flex flex-col gap-4 rounded-lg border border-brand-light-gray p-4"
              aria-label={`תובנה: ${insight.question}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="type-caption text-muted-foreground">
                    נשמרה ב-<bdi dir="ltr">{formatDate(today(new Date(insight.createdAt)))}</bdi>
                  </p>
                  <h3 className="type-body font-medium" dir="auto">
                    {insight.question}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`מחיקת התובנה: ${insight.question}`}
                  onClick={() => setToDelete(insight)}
                >
                  <Trash2 aria-hidden className="text-error" />
                </Button>
              </div>
              <ReplyBody reply={insight.reply} />
            </article>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="מחיקת תובנה"
        description="למחוק את התובנה השמורה? אי אפשר לבטל את הפעולה."
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </details>
  );
}
