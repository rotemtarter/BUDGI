"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Info icon that shows a short explanation (e.g. a metric's formula) on click
// or keyboard (DESIGN.md 1.7). Works on touch screens, unlike a hover tooltip.
export function InfoPopover({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 type-small text-brand-dark">
        {children}
      </PopoverContent>
    </Popover>
  );
}
