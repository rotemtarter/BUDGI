import Link from "next/link";
import { Info, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Amount } from "@/components/common/amount";
import { formatILS } from "@/lib/currency/format";
import { formatPercent } from "@/lib/format/numbers";
import { ACTION_LABELS } from "@/lib/advisor/messages";
import { CampaignLinks } from "./campaign-links";
import type { AdvisorReply, Recommendation } from "@/lib/advisor/schema";

// One AI answer (DESIGN.md 1.12): explanation, recommendation cards,
// limitations and, when data is missing, what to enter or import

export function AiAvatar() {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent">
      <Sparkles className="size-5 text-primary" />
    </span>
  );
}

// White card on the left side (in RTL) with the star icon
export function AiMessage({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3 self-end" role="group" aria-label={label}>
      <div className="flex w-full max-w-[640px] flex-col gap-4 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card md:p-5">
        {children}
      </div>
      <AiAvatar />
    </div>
  );
}

export function AdvisorReplyCard({ reply, footer }: { reply: AdvisorReply; footer?: React.ReactNode }) {
  return (
    <AiMessage label="תשובת ה-Advisor">
      <ReplyBody reply={reply} />
      {footer}
    </AiMessage>
  );
}

// The answer's content; also shown in a saved insight
export function ReplyBody({ reply }: { reply: AdvisorReply }) {
  return (
    <>
      <p className="type-body whitespace-pre-line" dir="auto">
        {reply.answer}
      </p>
      {reply.recommendations.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="המלצות">
          {reply.recommendations.map((rec, i) => (
            <li key={i}>
              <RecommendationCard recommendation={rec} />
            </li>
          ))}
        </ul>
      )}
      {reply.missingDataRequest && <MissingDataCard text={reply.missingDataRequest} />}
      {reply.limitations.length > 0 && <Limitations items={reply.limitations} />}
    </>
  );
}

function CampaignNames({ recommendation }: { recommendation: Recommendation }) {
  const [first, second] = recommendation.campaigns;
  const name = (n: string) => <bdi className="font-medium">{n}</bdi>;
  if (recommendation.actionType === "reallocate" && second) {
    return (
      <p className="type-small">
        מ-{name(first.name)} ל-{name(second.name)}
      </p>
    );
  }
  return (
    <p className="type-small">
      {recommendation.campaigns.map((c, i) => (
        <span key={c.id}>
          {i > 0 && ", "}
          {name(c.name)}
        </span>
      ))}
    </p>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { amountIls, percentage } = recommendation;
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-brand-light-gray border-s-4 border-s-brand-purple bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 type-caption font-medium text-primary">
          {ACTION_LABELS[recommendation.actionType]}
        </span>
        <p className="type-h4 text-brand-dark">
          {amountIls !== null && <Amount text={formatILS(amountIls)} />}
          {amountIls !== null && percentage !== null && <span className="mx-1.5 text-muted-foreground">·</span>}
          {percentage !== null && <bdi dir="ltr">{formatPercent(percentage)}</bdi>}
        </p>
      </div>
      <CampaignNames recommendation={recommendation} />
      <p className="type-small" dir="auto">
        <span className="font-medium">למה: </span>
        {recommendation.rationale}
      </p>
      {recommendation.expectedImpact && (
        <p className="type-small text-muted-foreground" dir="auto">
          <span className="font-medium">השפעה צפויה: </span>
          {recommendation.expectedImpact}
        </p>
      )}
    </article>
  );
}

function Limitations({ items }: { items: string[] }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg bg-muted p-3" aria-label="הסתייגויות">
      <h3 className="flex items-center gap-1.5 type-small font-medium text-brand-dark">
        <Info aria-hidden className="size-4" />
        הסתייגויות
      </h3>
      {/* Gray is below 4.5:1 on bg-muted (axe) */}
      <ul className="list-disc ps-5 type-small text-brand-dark/80">
        {items.map((item, i) => (
          <li key={i} dir="auto">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MissingDataCard({ text }: { text: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-brand-indigo/50 bg-accent p-4" aria-label="חסרים נתונים">
      <p className="type-small" dir="auto">
        {text}
      </p>
      <div className="flex flex-wrap gap-2">
        <CampaignLinks label="להזנת נתונים" size="sm" />
        <Link href="/imports" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          לייבוא
        </Link>
      </div>
    </section>
  );
}
