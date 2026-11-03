import type { NewAlert } from "@/lib/alerts/types";

// Result returned by form Server Actions to the client. A save that runs the
// alert check returns the alerts it created (DESIGN.md 1.9 pop-ups).
export type FormResult =
  | { ok: true; alerts?: NewAlert[] }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export const SAVE_FAILED_MESSAGE = "השמירה נכשלה. נסה שוב.";
