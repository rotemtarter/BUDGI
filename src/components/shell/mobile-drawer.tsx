"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";

// Mobile navigation: ☰ opens the sidebar as a drawer from the right (DESIGN.md 1.15)
export function MobileDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="פתיחת תפריט ניווט" />}>
        <Menu aria-hidden className="size-6" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-6 bg-white p-4 pt-14 supports-backdrop-filter:backdrop-blur-none">
        <SheetTitle className="sr-only">תפריט ניווט</SheetTitle>
        <div className="w-28 px-3">
          <Logo sizes="112px" />
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
