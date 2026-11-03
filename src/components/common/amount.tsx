// Shows a formatted amount such as "₪12,500". Plus Jakarta Sans claims the ₪
// sign but has no glyph for it, so the sign is drawn with Rubik (as in NumberInput).
export function Amount({ text }: { text: string }) {
  const parts = text.split("₪");
  return (
    <span dir="ltr">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="font-[family-name:var(--font-rubik)]">₪</span>}
          {part}
        </span>
      ))}
    </span>
  );
}
