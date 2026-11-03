import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/campaigns/platforms";

export type StatusFilterValue = CampaignStatus | "all";

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "active", label: "פעילים" },
  { value: "paused", label: "מושהים" },
  { value: "ended", label: "הסתיימו" },
  { value: "all", label: "הכול" },
];

// Status filter above the campaigns table (DESIGN.md 1.4); kept in the URL
export function StatusFilter({ value }: { value: StatusFilterValue }) {
  return (
    <nav aria-label="סינון לפי סטטוס">
      <ul className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <li key={option.value}>
              <Link
                href={option.value === "active" ? "/campaigns" : `/campaigns?status=${option.value}`}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex h-11 items-center rounded-xl border px-4 type-small font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9",
                  active
                    ? "border-primary bg-accent text-primary"
                    : "border-brand-light-gray bg-white text-brand-dark hover:bg-accent",
                )}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
