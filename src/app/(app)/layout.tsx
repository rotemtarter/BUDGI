import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/shell/app-header";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { SkipLink } from "@/components/shell/skip-link";
import { requireOnboardedUser } from "@/server/auth/session";

// The Shell for every inner screen (DESIGN.md 1.15): sidebar on the right
// from 768px, top header, content up to 1280px.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1">
      <SkipLink />
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-e border-brand-light-gray bg-white px-4 py-6 md:flex">
        <div className="w-24 px-3">
          <Logo priority sizes="96px" />
        </div>
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-8 md:py-8">
          <Suspense fallback={<PageSkeleton />}>
            <OnboardedOnly>{children}</OnboardedOnly>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Signed-in users who have not finished onboarding go there first
async function OnboardedOnly({ children }: { children: React.ReactNode }) {
  await requireOnboardedUser();
  return children;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="טוען">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
