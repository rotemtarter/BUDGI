import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

// Placeholder for screens built in later milestones
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-4 rounded-xl border border-brand-light-gray bg-white px-6 py-16 text-center shadow-card">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent">
          <Hammer aria-hidden className="size-7 text-primary" />
        </span>
        <p className="type-h4">בקרוב</p>
        <p className="type-body text-muted-foreground">המסך הזה ייבנה בקרוב.</p>
      </div>
    </>
  );
}
