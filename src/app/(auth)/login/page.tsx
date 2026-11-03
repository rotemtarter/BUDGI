import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { DecorativeBackground } from "@/components/brand/decorative-background";
import { GoogleButton, LoginErrorMessage } from "./google-button";

export const metadata: Metadata = { title: "התחברות · Budgi" };

// DESIGN.md 1.1: one screen, Google only, no Shell
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center px-4 py-12">
      <DecorativeBackground />
      <div className="flex w-full max-w-[420px] flex-col items-center gap-8 rounded-xl border border-brand-light-gray bg-white px-6 py-10 shadow-card md:px-10">
        <div className="w-full max-w-[280px]">
          <Logo variant="full" priority sizes="280px" />
        </div>
        <h1 className="sr-only">התחברות ל-Budgi</h1>
        <div className="flex w-full flex-col items-center gap-3">
          <Suspense>
            <CallbackError searchParams={searchParams} />
          </Suspense>
          <GoogleButton />
          <p className="text-center type-small text-muted-foreground">
            אין לך חשבון? הוא ייווצר אוטומטית בהתחברות הראשונה.
          </p>
        </div>
      </div>
      <LegalLinks />
    </main>
  );
}

async function CallbackError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return error ? <LoginErrorMessage /> : null;
}

function LegalLinks() {
  return (
    <nav aria-label="מידע משפטי" className="mt-6 flex gap-4 type-small">
      <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
        תנאי שימוש
      </Link>
      <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
        מדיניות פרטיות
      </Link>
    </nav>
  );
}
