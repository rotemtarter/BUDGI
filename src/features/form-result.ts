// Result returned by form Server Actions to the client
export type FormResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export const SAVE_FAILED_MESSAGE = "השמירה נכשלה. נסה שוב.";
