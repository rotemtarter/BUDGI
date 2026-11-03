import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Bell } from "lucide-react";
import { countUnreadAlerts } from "@/server/repositories/alerts";

const CLASS =
  "relative flex size-11 items-center justify-center rounded-xl text-brand-dark outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:size-10";

// Bell in the top bar with the number of unread alerts (DESIGN.md 1.9, 1.15)
export async function AlertsBell() {
  let unread = 0;
  try {
    unread = await countUnreadAlerts();
  } catch (error) {
    // Let Next.js handle its own render signals; otherwise the header still works without the counter
    unstable_rethrow(error);
    console.error("countUnreadAlerts failed", { code: (error as { code?: string }).code });
  }
  return <BellLink unread={unread} />;
}

export function BellLink({ unread = 0 }: { unread?: number }) {
  const label = unread > 0 ? `התראות, ${unread} שלא נקראו` : "התראות";
  return (
    <Link href="/alerts" aria-label={label} className={CLASS}>
      <Bell aria-hidden className="size-5" />
      {unread > 0 && (
        <span
          aria-hidden
          data-testid="unread-count"
          className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] leading-none font-semibold text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
