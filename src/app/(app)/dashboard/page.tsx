import Link from "next/link";
import type { Metadata } from "next";
import { ChartNoAxesCombined } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "סקירה כללית · Budgi" };

// Home (DESIGN.md 1.3). Until Milestone 5 there is no data to show, so only
// the empty state from DESIGN.md 1.14 is rendered.
export default function DashboardPage() {
  return (
    <>
      <PageHeader title="סקירה כללית" />
      <EmptyState
        icon={ChartNoAxesCombined}
        title="עוד אין נתונים לתקופה הזו"
        description="צור קמפיין והזן נתונים שבועיים, או ייבא קובץ עם הנתונים שלך."
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
    </>
  );
}
