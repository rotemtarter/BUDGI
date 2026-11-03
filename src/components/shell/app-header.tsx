import { Suspense } from "react";
import Link from "next/link";
import { Bell, CircleUserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/server/auth/session";
import { MobileDrawer } from "./mobile-drawer";

// Top bar (DESIGN.md 1.15). The unread-alerts counter on the bell arrives in Milestone 7.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-light-gray bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="md:hidden">
        <MobileDrawer />
      </div>
      <Link href="/dashboard" className="mx-auto w-24 md:hidden" aria-label="Budgi — מסך הבית">
        <Logo sizes="96px" />
      </Link>
      <div className="flex items-center gap-2 md:ms-auto">
        <div className="hidden items-center gap-2 md:flex">
          <Suspense fallback={<Skeleton className="h-5 w-24" />}>
            <UserName />
          </Suspense>
          <CircleUserRound aria-hidden className="size-6 text-brand-dark" />
        </div>
        <Link
          href="/alerts"
          aria-label="התראות"
          className="flex size-11 items-center justify-center rounded-xl text-brand-dark outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:size-10"
        >
          <Bell aria-hidden className="size-5" />
        </Link>
      </div>
    </header>
  );
}

async function UserName() {
  const user = await getCurrentUser();
  const name = user?.displayName || user?.email;
  return (
    <span className="type-small font-medium text-brand-dark" data-testid="header-user-name">
      {name}
    </span>
  );
}
