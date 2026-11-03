// File-level import errors, shown under the drop zone (DESIGN.md 1.11)
export const FILE_MESSAGES = {
  unsupported: "סוג הקובץ לא נתמך. אפשר להעלות קובץ CSV או Excel (XLSX).",
  tooBig: "הקובץ גדול מ-5MB. אפשר לפצל אותו לכמה קבצים.",
  empty: "הקובץ ריק.",
  noData: "בקובץ אין שורות נתונים מתחת לשורת הכותרות.",
  tooManyRows: "בקובץ יש יותר מ-5,000 שורות. אפשר לפצל אותו לכמה קבצים.",
  unreadable: "לא הצלחנו לקרוא את הקובץ. ודא שהוא תקין ונסה שוב.",
} as const;
