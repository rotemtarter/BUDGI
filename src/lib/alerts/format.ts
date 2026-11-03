import { TIME_ZONE } from "@/lib/dates/month";
import { addDays, today } from "@/lib/dates/week";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Alert time stamp (DESIGN.md 1.9): "היום, 10:24", "אתמול, 16:32", otherwise
// "03.11.2026, 09:15" — in Israel time
export function formatAlertTime(createdAt: string, now: Date = new Date()): string {
  const instant = new Date(createdAt);
  const date = today(instant);
  const time = timeFormatter.format(instant);
  const todayDate = today(now);
  if (date === todayDate) return `היום, ${time}`;
  if (date === addDays(todayDate, -1)) return `אתמול, ${time}`;
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}, ${time}`;
}
