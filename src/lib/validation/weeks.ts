import { z } from "zod";
import { isDateString, startOfWeek } from "@/lib/dates/week";
import { numberField } from "./numbers";

export const WEEK_FIELDS = ["spend", "leads", "deals", "new_customers", "revenue"] as const;
export type WeekField = (typeof WEEK_FIELDS)[number];

export const AT_LEAST_ONE_FIELD_MESSAGE = "יש למלא לפחות שדה אחד";

// One weekly row (PRD 4.3): every field is optional, but at least one is filled.
// Any date is normalized to the Sunday of its week; empty → null, never 0.
export const weekSchema = z
  .object({
    date: z
      .string()
      .refine(isDateString, "יש לבחור תאריך")
      .transform(startOfWeek),
    spend: numberField(),
    leads: numberField({ integer: true }),
    deals: numberField({ integer: true }),
    new_customers: numberField({ integer: true }),
    revenue: numberField(),
  })
  .superRefine((values, ctx) => {
    if (WEEK_FIELDS.every((field) => values[field] === null)) {
      ctx.addIssue({ code: "custom", path: ["root"], message: AT_LEAST_ONE_FIELD_MESSAGE });
    }
  });

export type WeekInput = z.input<typeof weekSchema>;
export type WeekValues = z.output<typeof weekSchema>;
