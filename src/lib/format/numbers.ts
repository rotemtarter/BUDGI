// Display formats for counts and metrics (DESIGN.md 2.2). A value that cannot
// be calculated or was not entered shows "—" (PRD 4.8).
export const NOT_AVAILABLE = "—";

const countFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const roasFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

// Whole numbers; split weekly counts are rounded for display only
export function formatCount(value: number | null): string {
  return value === null ? NOT_AVAILABLE : countFormatter.format(Math.round(value));
}

// "3.2"
export function formatRoas(value: number | null): string {
  return value === null ? NOT_AVAILABLE : roasFormatter.format(value);
}

// "12.5%"
export function formatPercent(value: number | null): string {
  return value === null ? NOT_AVAILABLE : `${percentFormatter.format(value)}%`;
}
