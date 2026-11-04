import { z } from "zod";

// Email and password sign-in, sign-up and password reset (ADR-21)

// At the owner's request (ADR-21). Supabase stores only a bcrypt hash.
export const MIN_PASSWORD = 15;
const MAX_PASSWORD = 72;

const email = z
  .string()
  .trim()
  .min(1, "יש להזין אימייל")
  .pipe(z.email("כתובת האימייל אינה תקינה"));

const newPassword = z
  .string()
  .min(MIN_PASSWORD, `הסיסמה צריכה להכיל לפחות ${MIN_PASSWORD} תווים`)
  .max(MAX_PASSWORD, `הסיסמה ארוכה מדי (עד ${MAX_PASSWORD} תווים)`);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "יש להזין סיסמה"),
});

export const signUpSchema = z
  .object({ email, password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "הסיסמאות אינן זהות", path: ["confirm"] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "הסיסמאות אינן זהות", path: ["confirm"] });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export const AUTH_MESSAGES = {
  invalidCredentials: "האימייל או הסיסמה שגויים",
  notConfirmed: "צריך לאשר קודם את כתובת האימייל. חפש אצלך מייל מ-Budgi עם קישור לאישור.",
  rateLimited: "נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות.",
  weakPassword: "הסיסמה חלשה מדי. בחר סיסמה ארוכה יותר, שאינה נפוצה.",
  samePassword: "הסיסמה החדשה זהה לקודמת",
  failed: "משהו השתבש. נסה שוב.",
  sessionExpired: "הקישור פג תוקף או כבר נוצל. בקש קישור חדש.",
} as const;

// Supabase Auth error codes → a Hebrew message for the user
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return AUTH_MESSAGES.invalidCredentials;
    case "email_not_confirmed":
      return AUTH_MESSAGES.notConfirmed;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return AUTH_MESSAGES.rateLimited;
    case "weak_password":
      return AUTH_MESSAGES.weakPassword;
    case "same_password":
      return AUTH_MESSAGES.samePassword;
    case "session_not_found":
    case "session_expired":
      return AUTH_MESSAGES.sessionExpired;
    default:
      return AUTH_MESSAGES.failed;
  }
}

// Where a confirmation link may send the user after it (no open redirects)
export const CONFIRM_NEXT = ["/onboarding", "/dashboard", "/reset-password"] as const;
export function safeNext(next: string | null): string {
  return CONFIRM_NEXT.find((path) => path === next) ?? "/dashboard";
}
