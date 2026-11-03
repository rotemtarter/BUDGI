import { z } from "zod";
import { isMonth } from "@/lib/dates/month";
import { numberField } from "./numbers";

export const GOAL_TYPES = ["revenue", "deals", "leads", "min_roas"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

// Empty field = no goal for that month (DESIGN.md 1.10)
export const goalsSchema = z.object({
  month: z.string().refine(isMonth, "חודש לא תקין"),
  revenue: numberField(),
  deals: numberField({ integer: true }),
  leads: numberField({ integer: true }),
  min_roas: numberField(),
});

export type GoalsInput = z.input<typeof goalsSchema>;
export type GoalsValues = z.output<typeof goalsSchema>;
