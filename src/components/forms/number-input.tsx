import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Numeric text field. Digits stay LTR inside the RTL layout (DESIGN.md 2.5);
// `currency` shows ₪ inside the field. The sign is drawn with Rubik: Plus
// Jakarta Sans claims U+20AA but has no glyph for it.
export function NumberInput({
  currency,
  integer,
  className,
  ...props
}: ComponentProps<"input"> & { currency?: boolean; integer?: boolean }) {
  return (
    <div className="relative">
      {currency && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-[family-name:var(--font-rubik)] text-muted-foreground"
        >
          ₪
        </span>
      )}
      <Input
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        dir="ltr"
        autoComplete="off"
        // The input itself is LTR, so the ₪ side is set physically (right), not with start/end
        className={cn("text-right", currency && "pr-8", className)}
        {...props}
      />
    </div>
  );
}
