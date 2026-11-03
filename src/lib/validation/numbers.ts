import { z } from "zod";

// Largest value that fits numeric(12,2)
const MAX_VALUE = 9_999_999_999.99;

type NumberFieldOptions = {
  integer?: boolean;
  // Message when an empty value is not allowed
  requiredMessage?: string;
};

// A form text field holding a number. Accepts "12,500" and "₪12,500".
// Empty → null ("not entered"), never 0 (PRD 4.8).
export function numberField({ integer = false, requiredMessage }: NumberFieldOptions = {}) {
  return z.string().transform((raw, ctx): number | null => {
    const value = raw.replace(/[\s,₪]/g, "");

    if (value === "") {
      if (requiredMessage) {
        ctx.addIssue({ code: "custom", message: requiredMessage });
        return z.NEVER;
      }
      return null;
    }

    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "יש להזין מספר" });
      return z.NEVER;
    }

    const number = Number(value);
    if (number < 0) {
      ctx.addIssue({ code: "custom", message: "יש להזין מספר שאינו שלילי" });
      return z.NEVER;
    }
    if (integer && !Number.isInteger(number)) {
      ctx.addIssue({ code: "custom", message: "יש להזין מספר שלם" });
      return z.NEVER;
    }
    if (!integer && /\.\d{3,}$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "אפשר להזין עד שתי ספרות אחרי הנקודה" });
      return z.NEVER;
    }
    if (number > MAX_VALUE) {
      ctx.addIssue({ code: "custom", message: "המספר גדול מדי" });
      return z.NEVER;
    }
    return number;
  });
}

// Same as numberField, but the parsed value is never null
export function requiredNumberField(requiredMessage: string, options: { integer?: boolean } = {}) {
  return numberField({ ...options, requiredMessage }).pipe(z.number());
}
