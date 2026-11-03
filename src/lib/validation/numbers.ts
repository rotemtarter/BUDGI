import { z } from "zod";

// Largest value that fits numeric(12,2), and a Postgres integer
const MAX_VALUE = 9_999_999_999.99;
const MAX_INTEGER = 2_147_483_647;

type NumberFieldOptions = {
  integer?: boolean;
  // Message when an empty value is not allowed
  requiredMessage?: string;
};

export type ParsedNumber = { ok: true; value: number | null } | { ok: false; message: string };

// Parses a number typed as text. Accepts "12,500" and "₪12,500".
// Empty → null ("not entered"), never 0 (PRD 4.8). Shared by the forms and the import.
export function parseNumber(raw: string, { integer = false }: { integer?: boolean } = {}): ParsedNumber {
  const value = raw.replace(/[\s,₪]/g, "");
  if (value === "") return { ok: true, value: null };

  if (!/^-?\d+(\.\d+)?$/.test(value)) return { ok: false, message: "יש להזין מספר" };

  const number = Number(value);
  if (number < 0) return { ok: false, message: "יש להזין מספר שאינו שלילי" };
  if (integer && !Number.isInteger(number)) return { ok: false, message: "יש להזין מספר שלם" };
  if (!integer && /\.\d{3,}$/.test(value)) {
    return { ok: false, message: "אפשר להזין עד שתי ספרות אחרי הנקודה" };
  }
  if (number > (integer ? MAX_INTEGER : MAX_VALUE)) return { ok: false, message: "המספר גדול מדי" };
  return { ok: true, value: number };
}

// A form text field holding a number (see parseNumber)
export function numberField({ integer = false, requiredMessage }: NumberFieldOptions = {}) {
  return z.string().transform((raw, ctx): number | null => {
    const parsed = parseNumber(raw, { integer });
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.message });
      return z.NEVER;
    }
    if (parsed.value === null && requiredMessage) {
      ctx.addIssue({ code: "custom", message: requiredMessage });
      return z.NEVER;
    }
    return parsed.value;
  });
}

// Same as numberField, but the parsed value is never null
export function requiredNumberField(requiredMessage: string, options: { integer?: boolean } = {}) {
  return numberField({ ...options, requiredMessage }).pipe(z.number());
}
