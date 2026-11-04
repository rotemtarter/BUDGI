import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// A summary card on the home screen (DESIGN.md 1.3): title, content and a
// link to the full screen
export function OverviewCard({
  title,
  id,
  link,
  children,
}: {
  title: string;
  id: string;
  link: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card md:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="type-h4">
          {title}
        </h2>
        <Link
          href={link.href}
          className="flex items-center gap-1 type-small font-medium text-primary underline-offset-4 hover:underline"
        >
          {link.label}
          <ArrowLeft aria-hidden className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
