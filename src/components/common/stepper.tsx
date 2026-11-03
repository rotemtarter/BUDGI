import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Step indicator (DESIGN.md 1.11). On mobile only the current step is named.
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <nav aria-label="שלבי התהליך" className="mb-6">
      <p className="type-small text-muted-foreground md:hidden">
        שלב {current + 1} מתוך {steps.length} · <span className="font-medium text-brand-dark">{steps[current]}</span>
      </p>
      <ol className="hidden items-center gap-3 md:flex">
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
              {index > 0 && <span aria-hidden className={cn("h-px w-10", done || active ? "bg-primary" : "bg-brand-light-gray")} />}
              <span
                aria-hidden
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border type-small font-semibold",
                  active && "border-transparent bg-gradient-button text-white",
                  done && "border-primary bg-accent text-primary",
                  !active && !done && "border-brand-light-gray bg-white text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              <span className={cn("type-small", active ? "font-semibold text-brand-dark" : "text-muted-foreground")}>
                <span className="sr-only">{done ? "הושלם: " : ""}</span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
