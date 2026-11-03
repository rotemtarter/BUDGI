import type { Metadata } from "next";

export const metadata: Metadata = { title: "תנאי שימוש · Budgi" };

// Placeholder until the product owner supplies the legal text (PRD 4.9)
export default function TermsPage() {
  return (
    <>
      <h1 className="type-h1">תנאי שימוש</h1>
      <p className="type-body text-muted-foreground">התוכן יעודכן בקרוב.</p>
    </>
  );
}
