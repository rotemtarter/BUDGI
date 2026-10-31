import Image from "next/image";
import logo from "../../../public/brand/logo.png";
import { cn } from "@/lib/utils";

// Approved Budgi logo, used as-is (DESIGN.md: do not redraw the symbol)
export function Logo({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={logo}
      alt="Budgi"
      priority={priority}
      className={cn("h-auto w-full", className)}
      sizes="(max-width: 768px) 80vw, 360px"
    />
  );
}
