import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ADVISOR_MESSAGES, SUGGESTED_QUESTIONS } from "@/lib/advisor/messages";
import { CampaignLinks } from "./campaign-links";

// Before the first question (DESIGN.md 1.12): a soft illustration and three
// suggested questions, or, with no data in the account, where to start
export function AdvisorIntro({
  hasData,
  disabled,
  onAsk,
}: {
  hasData: boolean;
  disabled: boolean;
  onAsk: (question: string) => void;
}) {
  return (
    <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-xl border border-brand-light-gray bg-white px-6 py-12 text-center shadow-card">
      <IntroIllustration />
      {hasData ? (
        <>
          <h2 className="type-h3">במה אפשר לעזור?</h2>
          <ul className="flex w-full max-w-md flex-col gap-2" aria-label="שאלות מוצעות">
            {SUGGESTED_QUESTIONS.map((question) => (
              <li key={question}>
                <Button
                  variant="secondary"
                  className="h-auto min-h-11 w-full py-2 whitespace-normal"
                  disabled={disabled}
                  onClick={() => onAsk(question)}
                >
                  {question}
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="type-h3">{ADVISOR_MESSAGES.noDataTitle}</h2>
          <p className="max-w-md type-body text-muted-foreground">{ADVISOR_MESSAGES.noDataText}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <CampaignLinks label="קמפיינים" />
            <Link href="/imports" className={buttonVariants({ variant: "secondary" })}>
              ייבוא נתונים
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// Star with a soft node network from the Style Guide (DESIGN.md 2.4)
function IntroIllustration() {
  return (
    <div aria-hidden className="relative flex size-24 items-center justify-center">
      <svg className="absolute inset-0 size-24 opacity-40" viewBox="0 0 100 100">
        <g stroke="#A78BFA" strokeWidth="1">
          <line x1="12" y1="20" x2="50" y2="50" />
          <line x1="88" y1="24" x2="50" y2="50" />
          <line x1="20" y1="84" x2="50" y2="50" />
          <line x1="84" y1="80" x2="50" y2="50" />
        </g>
        <g fill="#8B5CFF">
          {[
            [12, 20],
            [88, 24],
            [20, 84],
            [84, 80],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
          ))}
        </g>
      </svg>
      <span className="relative flex size-14 items-center justify-center rounded-full bg-accent">
        <Sparkles className="size-7 text-primary" />
      </span>
    </div>
  );
}
