import Image from "next/image";
import logo from "../../../public/brand/logo.png";
import logoCompact from "../../../public/brand/logo-compact.png";
import { cn } from "@/lib/utils";

// Approved Budgi logo, used as-is (DESIGN.md: do not redraw the symbol).
// "full" includes the "Spend Smart. Grow Smarter." line and is used on the
// sign-in screen only; "compact" is the same image cropped above that line.
export function Logo({
  className,
  priority,
  sizes = "(max-width: 768px) 80vw, 360px",
  variant = "compact",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
  variant?: "full" | "compact";
}) {
  return (
    <Image
      src={variant === "full" ? logo : logoCompact}
      alt="Budgi"
      priority={priority}
      // The PNG has a white background; multiply blends it into light surfaces
      className={cn("h-auto w-full mix-blend-multiply", className)}
      sizes={sizes}
    />
  );
}
