import type { ReactNode } from "react";

// Screen title (H2, DESIGN.md 2.2) with optional actions on the left
export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="type-h2" dir="auto">
        {title}
      </h1>
      {actions}
    </div>
  );
}
