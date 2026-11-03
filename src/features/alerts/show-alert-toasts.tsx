"use client";

import { toast } from "sonner";
import type { NewAlert } from "@/lib/alerts/types";
import { openAlertAction } from "./actions";

const DURATION_MS = 6_000;

// One pop-up per new alert, top-left in RTL for 6 seconds (DESIGN.md 1.9).
// Sonner announces them to screen readers.
export function showAlertToasts(alerts: NewAlert[] | undefined) {
  for (const alert of alerts ?? []) {
    const show = alert.severity === "critical" ? toast.error : alert.severity === "warning" ? toast.warning : toast.success;
    show(alert.title, {
      id: `alert-${alert.id}`,
      duration: DURATION_MS,
      description: (
        <>
          {alert.campaignName && (
            <span className="block font-medium" dir="auto">
              {alert.campaignName}
            </span>
          )}
          {alert.description}
        </>
      ),
      action: {
        label: "לפרטים",
        onClick: async () => {
          const result = await openAlertAction(alert.id);
          if (result && !result.ok) toast.error(result.message);
        },
      },
    });
  }
}
