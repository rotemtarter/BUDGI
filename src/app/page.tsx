import { Suspense } from "react";
import { connection } from "next/server";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkSupabaseHealth } from "@/lib/supabase/health";

// Temporary page for Milestone 1: brand, fonts, colors and RTL check.
// Replaced by the login screen in Milestone 2.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center gap-8 px-4 py-12">
      <div className="flex w-full flex-col items-center rounded-xl bg-white p-6 shadow-card">
        <div className="w-full max-w-[360px]">
          <Logo priority />
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>בדיקת עיצוב</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="type-h1">כותרת H1</h1>
            <h2 className="type-h2">כותרת H2</h2>
            <h3 className="type-h3">כותרת H3</h3>
            <h4 className="type-h4">כותרת H4</h4>
            <p className="type-body">
              טקסט רגיל בעברית, עם מונחים באנגלית: <span dir="ltr">ROAS 2.3</span>,{" "}
              <span dir="ltr">CPL</span> ותקציב של <span dir="ltr">₪12,500</span>.
            </p>
            <p className="type-small text-muted-foreground">טקסט משני קטן</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button>כפתור ראשי</Button>
            <Button variant="secondary">כפתור משני</Button>
            <Button variant="link">כפתור טקסט</Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sample-budget">
                תקציב שיווק חודשי <span className="text-error">*</span>
              </Label>
              <Input id="sample-budget" placeholder="לדוגמה 10,000" inputMode="numeric" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sample-disabled">שדה מושבת</Label>
              <Input id="sample-disabled" placeholder="לא ניתן לעריכה" disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<p className="type-small text-muted-foreground">בודק חיבור למסד הנתונים…</p>}>
        <DatabaseStatus />
      </Suspense>
    </main>
  );
}

async function DatabaseStatus() {
  // Run the check on every request, not at build time
  await connection();
  const health = await checkSupabaseHealth();

  const status = {
    ok: { text: "תקין", Icon: CircleCheck, color: "text-success" },
    error: { text: "לא תקין", Icon: CircleX, color: "text-error" },
    missing_config: {
      text: (
        <>
          חסרים פרטי חיבור בקובץ <span dir="ltr">.env</span>
        </>
      ),
      Icon: CircleAlert,
      color: "text-warning",
    },
  }[health];

  return (
    <p className="flex items-center gap-2 type-small" data-testid="db-status" data-status={health}>
      <status.Icon aria-hidden className={`size-4 ${status.color}`} />
      <span>
        חיבור למסד הנתונים (<span dir="ltr">budgi-dev</span>):{" "}
        <span className={`font-medium ${status.color}`}>{status.text}</span>
      </span>
    </p>
  );
}
