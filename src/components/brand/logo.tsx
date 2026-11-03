import Image from "next/image";
import logo from "../../../public/brand/logo.png";
import { cn } from "@/lib/utils";

// Approved Budgi logo, used as-is (DESIGN.md: do not redraw the symbol)
export function Logo({
  className,
  priority,
  sizes = "(max-width: 768px) 80vw, 360px",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={logo}
      alt="Budgi"
      priority={priority}
      // The PNG has a white background; multiply blends it into light surfaces
      className={cn("h-auto w-full mix-blend-multiply", className)}
      sizes={sizes}
    />
  );
}
