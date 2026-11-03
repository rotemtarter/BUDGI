"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

type Props = { onNavigate?: () => void };

// Navigation list shared by the desktop sidebar and the mobile drawer.
// On dynamic routes (e.g. /campaigns/[id]) the path is known only at request
// time, so the list is prerendered without a selected item and streams in.
export function SidebarNav(props: Props) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <CurrentNavList {...props} />
    </Suspense>
  );
}

function CurrentNavList(props: Props) {
  const pathname = usePathname();
  return <NavList {...props} pathname={pathname} />;
}

function NavList({ onNavigate, pathname }: Props & { pathname: string | null }) {
  return (
    <nav aria-label="ניווט ראשי">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 type-small font-medium text-brand-dark transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-accent text-primary",
                )}
              >
                <Icon aria-hidden className={cn("size-5", active ? "text-primary" : "text-brand-dark")} />
                <span dir="auto">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
