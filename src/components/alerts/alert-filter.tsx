import Link from "next/link";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "all", label: "הכול", href: "/alerts" },
  { value: "unread", label: "לא נקראו", href: "/alerts?filter=unread" },
] as const;

// "הכול" / "לא נקראו" (DESIGN.md 1.9); kept in the URL
export function AlertFilter({ value }: { value: "all" | "unread" }) {
  return (
    <nav aria-label="סינון התראות">
      <ul className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <li key={option.value}>
              <Link
                href={option.href}
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
