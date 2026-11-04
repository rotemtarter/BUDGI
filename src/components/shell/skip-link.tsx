// First focusable element of the Shell: lets keyboard users jump past the
// navigation (DESIGN.md 2.5). Hidden until it gets focus.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-lg bg-white px-4 py-2 type-small font-medium text-primary shadow-modal focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      דילוג לתוכן הראשי
    </a>
  );
}
