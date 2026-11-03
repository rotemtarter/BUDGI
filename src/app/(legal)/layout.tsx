import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";

// DESIGN.md 1.13: simple pages without the Shell, open without signing in
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-8 px-4 py-10">
      <div className="w-24">
        <Logo sizes="96px" />
      </div>
      <article className="flex flex-col gap-4 rounded-xl border border-brand-light-gray bg-white p-6 shadow-card md:p-8">
        {children}
      </article>
      <Link
        href="/"
        className="flex items-center gap-2 self-start type-small font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowRight aria-hidden className="size-4" />
        חזרה ל-Budgi
      </Link>
    </main>
  );
}
