import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

// Empty state for the home and metrics screens (DESIGN.md 1.14)
export function NoPeriodData() {
  return (
    <EmptyState
      icon={ChartNoAxesCombined}
      title="עוד אין נתונים לתקופה הזו"
      description="צור קמפיין והזן נתונים שבועיים, או ייבא קובץ עם הנתונים שלך. אפשר גם לבחור תקופה אחרת."
      actions={
        <>
          <Link href="/campaigns/new" className={buttonVariants()}>
            הוספת קמפיין
          </Link>
          <Link href="/imports" className={buttonVariants({ variant: "secondary" })}>
            ייבוא נתונים
          </Link>
        </>
      }
    />
  );
}
