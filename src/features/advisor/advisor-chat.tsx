"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Bookmark, Check, SendHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { AdvisorIntro } from "@/components/advisor/advisor-intro";
import { AdvisorReplyCard, AiMessage } from "@/components/advisor/advisor-reply";
import { CampaignChoicesProvider, type CampaignChoice } from "@/components/advisor/campaign-links";
import { ADVISOR_MESSAGES } from "@/lib/advisor/messages";
import {
  DAILY_QUESTION_LIMIT,
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_LENGTH,
  type AdvisorReply,
  type AdvisorResponse,
  type HistoryMessage,
  type SavedInsight,
} from "@/lib/advisor/schema";
import { saveInsightAction } from "./actions";
import { SavedInsights } from "./saved-insights";

// AI Budget Advisor chat (DESIGN.md 1.12). The conversation lives only in this
// component's state: leaving the screen or refreshing it clears it (PRD 4.7).
// Only answers the user saves as insights are stored.

type Entry =
  | { id: number; kind: "question"; text: string }
  | { id: number; kind: "reply"; question: string; reply: AdvisorReply; saved: boolean }
  | { id: number; kind: "error"; question: string };

// Show the character count from here on
const COUNT_FROM = MAX_QUESTION_LENGTH - 200;

// Earlier questions that got an answer, with that answer's text (the last 10)
function historyFrom(entries: Entry[]): HistoryMessage[] {
  const messages: HistoryMessage[] = [];
  entries.forEach((entry, i) => {
    const next = entries[i + 1];
    if (entry.kind === "question" && next?.kind === "reply") {
      messages.push({ role: "user", content: entry.text }, { role: "assistant", content: next.reply.answer });
    }
  });
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

export function AdvisorChat({
  initialRemaining,
  hasData,
  initialInsights,
  campaigns,
}: {
  initialRemaining: number;
  hasData: boolean;
  initialInsights: SavedInsight[];
  // For "enter data" links when data is missing
  campaigns: CampaignChoice[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [insights, setInsights] = useState(initialInsights);
  const [saving, startSave] = useTransition();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const limitReached = remaining <= 0;
  const disabled = pending || limitReached;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries, pending]);

  async function ask(question: string, { retry = false } = {}) {
    const text = question.trim();
    if (!text || disabled) return;
    const history = historyFrom(entries);
    const id = () => nextId.current++;

    setEntries((current) =>
      retry
        ? current.filter((e) => !(e.kind === "error" && e.question === text))
        : [...current, { id: id(), kind: "question", text }],
    );
    if (!retry) setDraft("");
    setPending(true);

    let body: AdvisorResponse | null = null;
    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });
      body = (await response.json()) as AdvisorResponse;
    } catch {
      body = null;
    }
    setPending(false);

    if (body?.ok) {
      setRemaining(body.remaining);
      setEntries((current) => [...current, { id: id(), kind: "reply", question: text, reply: body.reply, saved: false }]);
    } else if (body?.limit) {
      setRemaining(0);
      setEntries((current) => [...current, { id: id(), kind: "error", question: text }]);
    } else {
      setEntries((current) => [...current, { id: id(), kind: "error", question: text }]);
    }
  }

  function saveInsight(entry: Extract<Entry, { kind: "reply" }>) {
    startSave(async () => {
      const result = await saveInsightAction({ question: entry.question, reply: entry.reply });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(ADVISOR_MESSAGES.savedToast);
      setInsights((current) => [result.insight, ...current]);
      setEntries((current) => current.map((e) => (e.id === entry.id && e.kind === "reply" ? { ...e, saved: true } : e)));
    });
  }

  return (
    // Fills the screen height, so the input row stays at the bottom even before the first question
    <CampaignChoicesProvider value={campaigns}>
      <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[760px] flex-col md:min-h-[calc(100dvh-8rem)]">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-7 text-primary" />
              <span dir="ltr">AI Budget</span>
            </span>
          }
          actions={
            <p className="type-small text-muted-foreground" aria-live="polite">
              נותרו <bdi dir="ltr">{remaining}</bdi> מתוך <bdi dir="ltr">{DAILY_QUESTION_LIMIT}</bdi> שאלות היום
            </p>
          }
        />
        <p className="-mt-4 mb-6 type-body text-muted-foreground">{ADVISOR_MESSAGES.intro}</p>
        <SavedInsights insights={insights} onDeleted={(id) => setInsights((current) => current.filter((i) => i.id !== id))} />

        <div className="flex flex-1 flex-col gap-4 pb-4" aria-live="polite" aria-busy={pending}>
          {entries.length === 0 && !pending ? (
            <AdvisorIntro hasData={hasData} disabled={disabled} onAsk={(q) => ask(q)} />
          ) : (
            entries.map((entry) => {
              if (entry.kind === "question") {
                return (
                  <p
                    key={entry.id}
                    dir="auto"
                    className="max-w-[85%] self-start rounded-xl rounded-se-sm bg-brand-light-blue px-4 py-3 type-body whitespace-pre-line"
                  >
                    {entry.text}
                  </p>
                );
              }
              if (entry.kind === "reply") {
                return (
                  <AdvisorReplyCard
                    key={entry.id}
                    reply={entry.reply}
                    footer={
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-fit"
                        disabled={entry.saved || saving}
                        onClick={() => saveInsight(entry)}
                      >
                        {entry.saved ? <Check aria-hidden /> : <Bookmark aria-hidden />}
                        {entry.saved ? ADVISOR_MESSAGES.insightSaved : ADVISOR_MESSAGES.saveInsight}
                      </Button>
                    }
                  />
                );
              }
              return (
                <AiMessage key={entry.id} label="שגיאה">
                  <p className="flex items-center gap-2 type-body text-error" role="alert">
                    <AlertCircle aria-hidden className="size-5 shrink-0" />
                    {ADVISOR_MESSAGES.failed}
                  </p>
                  {!limitReached && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                      disabled={disabled}
                      onClick={() => ask(entry.question, { retry: true })}
                    >
                      נסה שוב
                    </Button>
                  )}
                </AiMessage>
              );
            })
          )}
          {pending && (
            <AiMessage label="ממתין לתשובה">
              <div className="flex flex-col gap-2" aria-label="טוען תשובה">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </AiMessage>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-brand-light-gray bg-background/95 px-4 pt-3 pb-4 backdrop-blur md:mx-0 md:rounded-t-xl md:px-0"
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
        >
          <p className="type-caption text-muted-foreground">
            {limitReached ? <span className="font-medium text-brand-dark">{ADVISOR_MESSAGES.limitReached}</span> : ADVISOR_MESSAGES.notSaved}
          </p>
          <div className="flex items-end gap-2">
            <label htmlFor="advisor-question" className="sr-only">
              שאלה ל-Advisor
            </label>
            <Textarea
              id="advisor-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
              maxLength={MAX_QUESTION_LENGTH}
              rows={1}
              placeholder={ADVISOR_MESSAGES.placeholder}
              disabled={disabled}
              className="max-h-40 min-h-11 resize-none"
              dir="auto"
            />
            <Button type="submit" size="icon" aria-label="שליחה" disabled={disabled || !draft.trim()}>
              <SendHorizontal aria-hidden className="rotate-180" />
            </Button>
          </div>
          {draft.length >= COUNT_FROM && (
            <p className="type-caption text-muted-foreground" aria-live="polite">
              <bdi dir="ltr">
                {draft.length}/{MAX_QUESTION_LENGTH}
              </bdi>
            </p>
          )}
        </form>
      </div>
    </CampaignChoicesProvider>
  );
}
