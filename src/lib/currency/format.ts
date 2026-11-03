// Amounts are ILS only (PRD 5.6). Whole amounts show no decimals (DESIGN.md 2.2).
const wholeFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// "₪12,500"
export function formatILS(amount: number): string {
  const formatter = Number.isInteger(amount) ? wholeFormatter : decimalFormatter;
  return `₪${formatter.format(amount)}`;
}

// Value for an input field: "12500" → "12,500"; null → ""
export function formatNumberInput(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}
