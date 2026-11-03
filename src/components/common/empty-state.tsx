import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Empty state: icon, short title, explanation and next step (DESIGN.md 1.14)
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-brand-light-gray bg-white px-6 py-16 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent">
        <Icon aria-hidden className="size-7 text-primary" />
      </span>
      <h2 className="type-h3">{title}</h2>
      {description && <p className="max-w-md type-body text-muted-foreground">{description}</p>}
      {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
