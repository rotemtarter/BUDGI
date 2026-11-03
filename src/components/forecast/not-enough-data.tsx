import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

// Fewer than 7 covered days in the month (PRD 4.5, DESIGN.md 1.8)
export function NotEnoughData() {
  return (
    <EmptyState
      icon={CalendarClock}
      title="אין עדיין מספיק נתונים לתחזית לחודש הזה"
      description="הזן לפחות שבוע אחד של נתונים."
      actions={
        <Link href="/campaigns" className={buttonVariants()}>
          לקמפיינים
        </Link>
      }
    />
  );
}
