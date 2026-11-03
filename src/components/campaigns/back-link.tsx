import Link from "next/link";
import { ArrowRight } from "lucide-react";

// "← קמפיינים" back link above campaign screens (DESIGN.md 1.5, 1.16)
export function BackLink({ href = "/campaigns", label = "קמפיינים" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 rounded-sm type-small font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowRight aria-hidden className="size-4" />
      <bdi>{label}</bdi>
    </Link>
  );
}
