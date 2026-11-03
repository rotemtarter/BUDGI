import { z } from "zod";
import {
  ALERT_TYPES,
  DEFAULT_ALERT_SETTINGS,
  MAX_PERFORMANCE_WEEKS,
  MAX_THRESHOLD,
  MIN_PERFORMANCE_WEEKS,
  type AlertSetting,
  type AlertSettings,
  type AlertType,
} from "@/lib/alerts/types";
import { parseNumber } from "./numbers";

// Whole number typed as text, within [min, max]
function wholeNumberField(min: number, max: number, rangeMessage: string) {
  return z.string().transform((raw, ctx): number => {
    const parsed = parseNumber(raw, { integer: true });
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.message });
      return z.NEVER;
    }
    if (parsed.value === null) {
      ctx.addIssue({ code: "custom", message: "יש להזין מספר" });
      return z.NEVER;
    }
    if (parsed.value < min || parsed.value > max) {
      ctx.addIssue({ code: "custom", message: rangeMessage });
      return z.NEVER;
    }
    return parsed.value;
  });
}

const settingSchema = z.object({
  enabled: z.boolean(),
  percent: wholeNumberField(0, MAX_THRESHOLD, `יש להזין סף בין 0 ל-${MAX_THRESHOLD}`),
  weeks: wholeNumberField(
    MIN_PERFORMANCE_WEEKS,
    MAX_PERFORMANCE_WEEKS,
    `יש להזין בין ${MIN_PERFORMANCE_WEEKS} ל-${MAX_PERFORMANCE_WEEKS} שבועות`,
  ),
});

// Settings form (DESIGN.md 1.10, area 3): one row per alert type
export const alertSettingsSchema = z.object(
  Object.fromEntries(ALERT_TYPES.map((type) => [type, settingSchema])) as Record<
    AlertType,
    typeof settingSchema
  >,
);

export type AlertSettingsInput = z.input<typeof alertSettingsSchema>;

// Form values: numbers as text
export function toAlertSettingsInput(settings: AlertSettings): AlertSettingsInput {
  return Object.fromEntries(
    ALERT_TYPES.map((type) => [
      type,
      {
        enabled: settings[type].enabled,
        percent: String(settings[type].percent),
        weeks: String(settings[type].weeks),
      },
    ]),
  ) as AlertSettingsInput;
}

// threshold_config as stored (JSONB). Read back with fromThresholdConfig.
export function toThresholdConfig(type: AlertType, setting: AlertSetting): Record<string, number> {
  if (type === "goal_reached") return {};
  if (type === "performance_drop") return { percent: setting.percent, weeks: setting.weeks };
  return { percent: setting.percent };
}

const storedConfigSchema = z.object({
  percent: z.number().int().min(0).max(MAX_THRESHOLD).optional(),
  weeks: z.number().int().min(MIN_PERFORMANCE_WEEKS).max(MAX_PERFORMANCE_WEEKS).optional(),
});

// A stored row back to a setting; an invalid config falls back to the defaults
export function fromThresholdConfig(type: AlertType, enabled: boolean, config: unknown): AlertSetting {
  const defaults = DEFAULT_ALERT_SETTINGS[type];
  const parsed = storedConfigSchema.safeParse(config);
  const values = parsed.success ? parsed.data : {};
  return {
    enabled,
    percent: values.percent ?? defaults.percent,
    weeks: values.weeks ?? defaults.weeks,
  };
}
