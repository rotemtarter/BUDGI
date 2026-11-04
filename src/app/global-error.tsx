"use client";

import "./globals.css";
import { ErrorCard } from "@/components/common/error-card";

// Last-resort error page, shown when even the root layout failed. It replaces
// the root layout, so it sets its own <html> (Hebrew, RTL) and styles.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-background p-4 font-sans">
        <title>שגיאה · Budgi</title>
        <main className="w-full max-w-lg">
          <ErrorCard
            title="משהו השתבש"
            description="לא הצלחנו לטעון את Budgi. נסה שוב בעוד רגע."
            action={
              <button
                type="button"
                onClick={() => retry()}
                className="h-11 rounded-lg bg-gradient-button px-5 font-medium text-primary-foreground shadow-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                נסה שוב
              </button>
            }
          />
        </main>
      </body>
    </html>
  );
}
