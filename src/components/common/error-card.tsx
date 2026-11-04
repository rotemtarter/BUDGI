import type { ReactNode } from "react";
import { TriangleAlert, type LucideIcon } from "lucide-react";

// Error state (DESIGN.md 1.14): a card with a Hebrew message and the next step
export function ErrorCard({
  icon: Icon = TriangleAlert,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-xl border border-brand-light-gray bg-white px-6 py-16 text-center shadow-card"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-accent">
        <Icon aria-hidden className="size-7 text-primary" />
      </span>
      <h1 className="type-h3">{title}</h1>
      <p className="max-w-md type-body text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
