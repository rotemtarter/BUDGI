// Legal page body (DESIGN.md 1.13): H1, last-updated date and sections of
// short paragraphs or bullet lists, at reading width.
export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };

export function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <h1 className="type-h1">{title}</h1>
      <p className="type-small text-muted-foreground">עדכון אחרון: {updated}</p>
      <p className="type-body">{intro}</p>
      {sections.map((section, index) => (
        <section key={section.title} className="flex flex-col gap-2 pt-2">
          <h2 className="type-h3">
            {index + 1}. {section.title}
          </h2>
          {section.paragraphs?.map((text) => (
            <p key={text} className="type-body">
              {text}
            </p>
          ))}
          {section.items && (
            <ul className="flex list-disc flex-col gap-1 ps-6 type-body">
              {section.items.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
