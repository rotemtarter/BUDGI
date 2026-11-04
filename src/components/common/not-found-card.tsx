import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ErrorCard } from "./error-card";

// "Page not found" error state (DESIGN.md 1.14), with a way back home
export function NotFoundCard() {
  return (
    <ErrorCard
      icon={SearchX}
      title="הדף לא נמצא"
      description="ייתכן שהכתובת שגויה או שהתוכן נמחק."
      action={
        <Link href="/dashboard" className={buttonVariants()}>
          חזרה למסך הבית
        </Link>
      }
    />
  );
}
