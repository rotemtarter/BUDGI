"use client";

import { Button } from "@/components/ui/button";
import { ErrorCard } from "@/components/common/error-card";

// A screen inside the Shell failed to load, e.g. Supabase was unavailable
// (DESIGN.md 1.14). Technical details stay in the server logs.
export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorCard
      title="לא הצלחנו לטעון את המסך"
      description="משהו השתבש בטעינת הנתונים. נסה שוב בעוד רגע."
      action={<Button onClick={() => retry()}>נסה שוב</Button>}
    />
  );
}
