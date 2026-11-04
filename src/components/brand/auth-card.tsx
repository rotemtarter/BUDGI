import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { DecorativeBackground } from "./decorative-background";

// The centered card of the sign-in screens (DESIGN.md 1.1), without the Shell
export function AuthCard({ title, children, fullLogo = false }: { title: string; children: ReactNode; fullLogo?: boolean }) {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center px-4 py-12">
      <DecorativeBackground />
      <div className="flex w-full max-w-[420px] flex-col items-center gap-6 rounded-xl border border-brand-light-gray bg-white px-6 py-10 shadow-card md:px-10">
        <div className={fullLogo ? "w-full max-w-[280px]" : "w-28"}>
          <Logo variant={fullLogo ? "full" : "compact"} priority sizes={fullLogo ? "280px" : "112px"} />
        </div>
        <h1 className={fullLogo ? "sr-only" : "type-h3"}>{title}</h1>
        {children}
      </div>
      <nav aria-label="מידע משפטי" className="mt-6 flex gap-4 type-small">
        <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
          תנאי שימוש
        </Link>
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
          מדיניות פרטיות
        </Link>
      </nav>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
