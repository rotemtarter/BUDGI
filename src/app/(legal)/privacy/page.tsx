import type { Metadata } from "next";

export const metadata: Metadata = { title: "מדיניות פרטיות · Budgi" };

// Placeholder until the product owner supplies the legal text (PRD 4.9)
export default function PrivacyPage() {
  return (
    <>
      <h1 className="type-h1">מדיניות פרטיות</h1>
      <p className="type-body text-muted-foreground">התוכן יעודכן בקרוב.</p>
    </>
  );
}
