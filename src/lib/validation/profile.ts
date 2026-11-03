import { z } from "zod";

export const MAX_BUSINESS_NAME = 100;

// Optional business name (shown in the header instead of the Google name).
// Spaces at the edges are removed; empty → null = use the Google name.
export const businessNameSchema = z.object({
  businessName: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(MAX_BUSINESS_NAME, `אפשר להזין עד ${MAX_BUSINESS_NAME} תווים`))
    .transform((value) => (value === "" ? null : value)),
});

export type BusinessNameInput = z.input<typeof businessNameSchema>;
export type BusinessNameValues = z.output<typeof businessNameSchema>;
