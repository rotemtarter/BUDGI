// Hebrew count phrases: "שורה אחת" / "3 שורות"
const n = (value: number) => value.toLocaleString("he-IL");

export function rowsLabel(count: number): string {
  return count === 1 ? "שורה אחת" : `${n(count)} שורות`;
}

export function campaignsLabel(count: number): string {
  return count === 1 ? "קמפיין חדש אחד" : `${n(count)} קמפיינים חדשים`;
}
