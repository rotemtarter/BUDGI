# תוכנית — Milestone 4: ייבוא CSV/Excel

> מקורות: `MILESTONES.md` (Milestone 4), `PRD.md` (3.2, 3.3, 3.4, 4.3, 4.8, 5.3, 5.6), `ARCHITECTURE.md` (1.1, 1.2, 2.2, 2.3, 3.1–3.2, 4.1, 4.2, 5.2, 6.2, 6.3, 6.5, 7.1, 8.1, ADR-1, ADR-6, ADR-7), `DESIGN.md` (1.11, 1.14, 1.15, 2.1–2.5, „סטיות מאושרות” — ייבוא בארבעה שלבים).
> מחוץ לאבן הדרך: הפעלת Alert Service אחרי ייבוא (M7 — יתווסף שם לאותה נקודה ב-commit), מסכי בית/מדדים/תקציב (M5), תחזית (M6).

## 1. מטרה ותוצר

בסוף אבן הדרך:
- מסך „ייבוא נתונים” (`/imports`) מחליף את דף „בקרוב”: מחוון ארבעה שלבים — העלאה, התאמת עמודות, בדיקה, סיום — באותו מסך.
- הורדת קובץ דוגמה של Budgi (XLSX, כותרות בעברית ושורות דוגמה) שמיובא כמו שהוא.
- פענוח קובצי CSV ו-XLSX בשרת, עם מגבלות 5MB ו-5,000 שורות.
- התאמת עמודות אוטומטית (כותרות קובץ הדוגמה) או ידנית.
- תצוגה מקדימה: שורות חדשות, עדכונים, קמפיינים חדשים, שורות שגויות (מספר שורה + סיבה בעברית), ותאריכים שהותאמו ליום ראשון.
- שמירה אחרי אישור בטרנזקציה אחת: יצירת הקמפיינים החדשים + Upsert של השבועות, כששדה ריק לא דורס ערך קיים.
- טבלת `import_jobs` שמתעדת כל ייבוא (סיכום מספרי ושם הקובץ בלבד).
- בדיקות Unit, Integration, RLS ו-Playwright.

## 2. החלטות טכניות לאבן הדרך

| נושא | החלטה | הסבר קצר |
|---|---|---|
| Next.js 16 | לפני הכתיבה — לקרוא ב-`node_modules/next/dist/docs` את Route Handlers (`route.ts`, `request.formData()`, החזרת קובץ להורדה), והתנהגות `cacheComponents` עם Route Handlers | ההנחיה ב-`AGENTS.md` |
| ממשק שרת | שלושה Route Handlers לפי ARCHITECTURE 4.2: `POST /api/imports/preview`, `POST /api/imports/commit`, `GET /api/imports/template`. כל אחד בודק Session והשלמת הגדרה ראשונית; בלי Session → `401` JSON (לא הפניה). Route Handler ולא Server Action כי Server Actions מוגבלים כברירת מחדל ל-1MB, והקובץ עד 5MB | ARCHITECTURE 4.1: „פעולות שדורשות קובץ — Route Handlers” |
| זרימה בלי שמירת קובץ | השרת לא שומר שום דבר בין השלבים. הדפדפן מחזיק את הקובץ ושולח אותו שוב בכל קריאה: `preview` (בלי התאמה → הצעת התאמה; עם התאמה → תצוגה מקדימה), ואז `commit` עם אותו קובץ ואותה התאמה. ה-commit מפענח ומאמת הכול מחדש בשרת — לא סומך על שורות שהדפדפן שולח | ARCHITECTURE 5.2 („ההתאמה הסופית נשלחת מחדש עם הקובץ”), 6.3, 6.5 (קובץ המקור אינו נשמר) |
| ספריית Excel | SheetJS מהמקור הרשמי (`https://cdn.sheetjs.com/xlsx-<latest>/xlsx-<latest>.tgz`, הגרסה האחרונה נבדקת בזמן הבנייה). **לא** חבילת `xlsx` שב-npm — היא תקועה בגרסה 0.18.5 עם פרצות אבטחה ידועות. קריאה עם `sheetRows` (תקרת שורות), בלי נוסחאות ובלי HTML; רק הגיליון הראשון | ARCHITECTURE 1.1; יתועד ב-ADR-8 |
| ספריית CSV | `papaparse` (זיהוי מפריד, מירכאות, BOM). כל הערכים נקראים כטקסט (`dynamicTyping: false`) — הנרמול נעשה אצלנו | ARCHITECTURE 1.1 („CSV parser”) |
| קידוד CSV בעברית | קריאה כ-UTF-8 (כולל BOM); אם הקובץ אינו UTF-8 תקין — קריאה כ-Windows-1255 (הקידוד שבו Excel בעברית שומר CSV) | בלי זה, קובצי CSV מ-Excel בעברית יוצגו כג'יבריש |
| בדיקת קובץ | סיומת `.csv` או `.xlsx` **וגם** תוכן: XLSX חייב להתחיל בחתימת ZIP (`PK`); CSV חייב להיות טקסט (בלי תווי NUL). גודל עד 5MB (נבדק גם בדפדפן לפני ההעלאה וגם בשרת). שורות ריקות לגמרי מדולגות בשקט ואינן נספרות; יותר מ-5,000 שורות נתונים → שגיאה. שורה ראשונה = כותרות; כותרת ריקה מוצגת „עמודה N” | ARCHITECTURE 6.3; PRD 3.4 |
| התאמת עמודות | ההתאמה היא לפי מיקום עמודה (אינדקס), כדי ששתי כותרות זהות לא יתנגשו. התאמה אוטומטית: השוואת כותרת (אחרי trim, בלי הבדל רישיות) לשמות בקובץ הדוגמה. אם שלושת שדות החובה זוהו → מדלגים לשלב 3 עם „העמודות זוהו אוטומטית”. אחרת → שלב 2, עם מה שזוהה כבר מסומן מראש. „המשך” פעיל רק כששלושת שדות החובה הותאמו. השרת מאמת שהאינדקסים קיימים ושדות החובה הותאמו | PRD 3.4, DESIGN 1.11 |
| תאריכים | טקסט `DD/MM/YYYY` (מקבלים גם ספרה אחת ביום/חודש, למשל `5/10/2026`) או `YYYY-MM-DD`; תאריך לא קיים (31/02) → שגיאה. בתא XLSX מסוג תאריך (מספר סידורי של Excel) — המרה לתאריך. אחרי זה `startOfWeek` הקיים; שורה שתאריכה זז נרשמת לרשימת „תאריכים שהותאמו” (מספר שורה, התאריך בקובץ, טווח השבוע) | PRD 3.4, DESIGN 1.11 |
| מספרים | חילוץ הלוגיקה של `numberField` לפונקציה טהורה משותפת `parseNumber(raw, { integer })` שמשמשת גם את הטפסים וגם את הייבוא — אותן הודעות שגיאה. טקסט: מסירים `₪`, פסיקים ורווחים. תא מספרי ב-XLSX: סכומים מעוגלים לשתי ספרות (שאריות חישוב של Excel כמו `1234.5600001`); בלידים/עסקאות/לקוחות — שבר הוא שגיאה. שלילי → שגיאה. תא ריק → `null` | PRD 4.8; עקביות עם M3 |
| פלטפורמות | השוואה בלי רישיות ורווחים: `Meta Ads`, `Google Ads`, `TikTok Ads`, `LinkedIn Ads`, וגם בלי המילה Ads (`Meta`, `Google`...). `Facebook` / `Instagram` (גם עם Ads) → `meta_ads`. ערך אחר → שגיאה „פלטפורמה לא מוכרת” | PRD 3.4 |
| ולידציה של שורה | חובה: שם קמפיין (אחרי trim, עד 100 תווים כמו ביצירת קמפיין), פלטפורמה, תאריך; לפחות ערך מספרי אחד. כל הסיבות של שורה מוצגות יחד. **שורות כפולות בקובץ** (אותו קמפיין — שם בלי רישיות/רווחים בקצוות + פלטפורמה — ואותו שבוע אחרי נרמול): כל השורות המעורבות שגויות, עם הפניה זו לזו („כפולה לשורה 7”) | PRD 3.4 |
| סיווג לתצוגה מקדימה | פונקציה טהורה `buildPreview(parsedRows, existingCampaigns, existingWeeks)`. השרת שולף את קמפייני המשתמש ואת השבועות הקיימים של הקמפיינים התואמים בטווח התאריכים של הקובץ. כל שורה תקינה: „חדשה” או „עדכון”; כל קמפיין שלא קיים: „ייווצר” (בשם כפי שהופיע לראשונה בקובץ, סטטוס פעיל, בלי תקציב) | PRD 3.4, ARCHITECTURE 5.2 |
| טרנזקציה | ה-Supabase client אינו תומך בטרנזקציות, לכן השמירה היא פונקציית SQL אחת `commit_import(...)` (security invoker, לפי `auth.uid()`, כמו `complete_onboarding`): יוצרת קמפיינים חסרים (`on conflict do nothing`), מבצעת Upsert לשבועות עם `coalesce(ערך חדש, ערך קיים)` לכל שדה ו-`source = 'import'`, ורושמת שורה ב-`import_jobs` — הכול או כלום. אילוצי ה-DB הקיימים (ערכים שליליים, יום ראשון, לפחות ערך אחד) נשארים קו הגנה אחרון | ARCHITECTURE 5.2 („בתוך Transaction אחת”) |
| ייבוא שנכשל | אם `commit_import` נכשלת — לא נשמר כלום; השרת מנסה לרשום שורה ב-`import_jobs` בסטטוס `failed` (בלי לחסום את הודעת השגיאה), ומוצגת הודעה „הייבוא נכשל ולא נשמרו נתונים. נסה שוב.” | ARCHITECTURE 8.2 (מדידת שגיאות ייבוא) |
| קובץ הדוגמה | XLSX שנבנה בשרת עם SheetJS: שמונה הכותרות בעברית (PRD 3.4) וכמה שורות דוגמה (שני קמפיינים, שתי פלטפורמות, תאריכים כטקסט `DD/MM/YYYY`, אחת עם שדה ריק). שם הקובץ: `budgi-sample.xlsx`. אין בו תאים שמתחילים ב-`= + - @` | DoD („קובץ הדוגמה מיובא בלי שינויים”); ARCHITECTURE 6.3 (Formula Injection) |
| מגבלת Vercel | Vercel מגביל גוף בקשה לפונקציה ל-4.5MB. מקומית הכול עובד עד 5MB; ב-Preview קובץ בין 4.5 ל-5MB יקבל מ-Vercel שגיאת `413`, והדפדפן יציג עליה את אותה הודעה „הקובץ גדול מדי”. בפועל קובץ תקין עד 5,000 שורות שוקל הרבה פחות (בסביבות 0.5MB). יתועד ב-ADR-8 | מגבלה של שירות האחסון; לא משנה את ה-PRD |
| ממשק — רכיבים | רכיב לקוח אחד `ImportWizard` שמחזיק את השלב, הקובץ, ההתאמה ותוצאת התצוגה המקדימה. מחוון שלבים עם `aria-current="step"`. אזור גרירה: `<label>` שעוטף `<input type="file" accept=".csv,.xlsx">` — עובד בגרירה, בלחיצה ובמקלדת. בחירת עמודות — `ChoiceSelect` הקיים, עם אפשרות „לא לייבא”, ודוגמת ערך מהשורה הראשונה. כרטיסי הסיכום, תגית פלטפורמה ו-Toast — רכיבים קיימים | DESIGN 1.11, 2.3, 2.5 |
| ממשק — טקסטים | שלב 3: הכפתור „ייבוא X שורות” (X = חדשות + עדכונים); אם X = 0 — הכפתור כבוי והסבר „אין שורות תקינות לייבוא”. שלב 4: „X שורות נשמרו, Y נדחו, Z קמפיינים נוצרו”, וכפתורים „מעבר לקמפיינים” ו„ייבוא קובץ נוסף”. „חזרה” בשלב 3 מחזיר לשלב 2 (גם אחרי זיהוי אוטומטי, כדי שאפשר יהיה לשנות התאמה). בזמן שליחה — כפתור כבוי עם „בודק…”/„מייבא…” | DESIGN 1.11 |
| מובייל | המחוון מקוצר (מספר + שם השלב הנוכחי), טבלת ההתאמה הופכת לרשימת שדות אחד מתחת לשני, טבלת השגיאות נגללת אופקית בתוך המכל | DESIGN 2.4 |
| רענון מסכים | אחרי commit מוצלח: `router.refresh()`, כך שמסכי הקמפיינים מציגים את הנתונים החדשים | עקביות עם M3 |
| לוגים | בשגיאות — רק קוד שגיאה וסוג פעולה, בלי תוכן הקובץ, שמות קמפיינים או סכומים | ARCHITECTURE 6.5, 8.2 |
| Migrations | כמו ב-ADR-6: קובץ ב-`supabase/migrations/`, מוחל על `budgi-dev` דרך Supabase MCP אחרי וידוא שם הפרויקט; שם הקובץ מיושר לגרסה שנרשמה; אחר כך `generate_typescript_types` ו-`get_advisors` (security) | ARCHITECTURE 7.5 |
| חשיפה ב-Data API | לפי ADR-6 — בודקים שהטבלה `import_jobs` והפונקציה `commit_import` נגישות. אם לא — עוצרים ומדריכים אותך צעד אחר צעד לסמן אותן ב-Supabase | ADR-6 |

## 3. Database — Migration אחד: `supabase/migrations/<version>_imports.sql`

### `import_jobs`
- `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `file_name text not null` (עד 255 תווים), `status text not null`, `rows_total integer not null default 0`, `rows_imported integer not null default 0`, `rows_rejected integer not null default 0`, `campaigns_created integer not null default 0`, `error_summary jsonb` (עד 100 השגיאות הראשונות: `[{row, reason}]` — מספר שורה וסיבה בלבד), `created_at timestamptz not null default now()`, `completed_at timestamptz`.
- CHECK: `status in ('completed', 'failed')`; כל המונים `>= 0`.
- אינדקס `(user_id, created_at desc)`.
- RLS: `select` ו-`insert` ל-`authenticated` עם `user_id = (select auth.uid())`. אין עדכון או מחיקה מהממשק (נמחקות עם המשתמש ב-Cascade).
- `revoke all … from anon, authenticated`; `grant select, insert … to authenticated`.

### `commit_import(p_file_name text, p_rows jsonb, p_rows_total integer, p_rows_rejected integer, p_errors jsonb) returns jsonb`
- `security invoker`, `set search_path = ''`; זורקת `42501` בלי `auth.uid()`.
- `p_rows`: מערך `{name, platform, week_start, spend, leads, deals, new_customers, revenue}` — רק השורות התקינות, אחרי נרמול בשרת.
- שלבים בתוך הפונקציה (טרנזקציה אחת):
  1. `insert into campaigns (user_id, name, platform)` לכל זוג (שם, פלטפורמה) ייחודי מתוך השורות, `on conflict do nothing` (על האינדקס הייחודי הקיים `(user_id, lower(btrim(name)), platform)`); סופרים כמה נוצרו בפועל.
  2. Upsert ל-`campaign_performance` עם `join` לקמפיינים לפי `lower(btrim(name))` ופלטפורמה; `on conflict (campaign_id, week_start) do update set spend = coalesce(excluded.spend, campaign_performance.spend)`, וכך לכל שדה, ו-`source = 'import'`. סופרים חדשות מול עדכונים (`xmax = 0`).
  3. `insert into import_jobs` בסטטוס `completed` עם המונים ו-`completed_at = now()`.
- מחזירה `{job_id, rows_inserted, rows_updated, campaigns_created}`.
- `revoke execute … from public, anon`; `grant execute … to authenticated`.
- ה-FK המורכב מ-M3 מבטיח שגם קריאה ישירה לפונקציה לא יכולה לכתוב לקמפיין של משתמש אחר.

## 4. קבצים ליצור / לשנות

### Database ו-Types
- `supabase/migrations/<version>_imports.sql` — חדש (סעיף 3).
- `src/lib/supabase/database.types.ts` — לייצר מחדש.

### תלויות
- `xlsx` מהמקור הרשמי של SheetJS (סעיף 2), `papaparse` + `@types/papaparse`.

### lib (טהור, נבדק ב-Unit)
- `src/lib/validation/numbers.ts` — חילוץ `parseNumber(raw, { integer })`; `numberField` משתמש בה (התנהגות הטפסים לא משתנה).
- `src/lib/imports/fields.ts` — שדות Budgi לייבוא (מפתח, כותרת בעברית, חובה), כותרות קובץ הדוגמה, תוויות לשלב ההתאמה.
- `src/lib/imports/normalize.ts` — `parseImportDate` (טקסט + מספר סידורי של Excel), `parsePlatform`, `parseImportNumber`, `campaignKey(name, platform)`.
- `src/lib/imports/mapping.ts` — `suggestMapping(headers)` → התאמה + האם זוהתה אוטומטית; `validateMapping`.
- `src/lib/imports/rows.ts` — `validateRows(table, mapping)` → שורות תקינות, שגיאות (מספר שורה בקובץ + סיבות), תאריכים שהותאמו, וזיהוי כפולות בקובץ.
- `src/lib/imports/preview.ts` — `buildPreview(validRows, existingCampaigns, existingWeeks)` → חדשות / עדכונים / קמפיינים חדשים.
- `src/lib/imports/types.ts` — טיפוסי התשובות של ה-API (משותפים לשרת ולדפדפן).

### server
- `src/server/import/parse-file.ts` — `readImportFile(file)`: בדיקת סוג/גודל/חתימה, פענוח CSV (כולל Windows-1255) או XLSX → `{ headers, rows }` כטבלת ערכים גולמיים; שגיאות קובץ בעברית.
- `src/server/import/template.ts` — בניית קובץ הדוגמה.
- `src/server/repositories/imports.ts` — `findWeeks(campaignIds, from, to)`, `commitImport(...)` (קריאה ל-`commit_import`), `recordFailedImport(...)`.
- `src/server/services/imports.ts` — מחבר הכול: `previewImport(file, mapping?)` ו-`commitImport(file, mapping)`.

### app
- `src/app/api/imports/preview/route.ts`, `src/app/api/imports/commit/route.ts`, `src/app/api/imports/template/route.ts`.
- `src/app/(app)/imports/page.tsx` — מחליף את „בקרוב”: כותרת „ייבוא נתונים” ו-`ImportWizard`.

### features / components
- `src/features/imports/import-wizard.tsx` — מצב השלבים והקריאות ל-API.
- `src/features/imports/upload-step.tsx`, `mapping-step.tsx`, `review-step.tsx`, `done-step.tsx`.
- `src/components/common/stepper.tsx` — מחוון השלבים.

### tests
- `tests/support/test-users.ts` — `resetTestUser` מוחק גם `import_jobs`.
- `tests/fixtures/imports/` — קובצי CSV קטנים: תקין עם כותרות הדוגמה, תקין עם כותרות אחרות, עם שגיאות (כולל כפולה, שלילי, שבר, תאריך לא תקין, פלטפורמה לא מוכרת, שורה בלי ערכים), ריק, CSV ב-Windows-1255, וקובץ `.txt`. קובצי XLSX וקובץ מעל 5MB נוצרים בזמן הבדיקה (לא נשמרים קבצים בינאריים ב-Git).
- `tests/unit/import-normalize.test.ts` — תאריכים (שני הפורמטים, ספרה אחת, 31/02, מספר סידורי, נרמול לראשון כולל מעבר שנה), פלטפורמות (Facebook/Instagram → Meta), מספרים (₪, פסיקים, עיגול סכום, שבר בלידים, שלילי, ריק → `null`).
- `tests/unit/import-rows.test.ts` — התאמה אוטומטית וידנית, שדה חובה חסר, שורה בלי ערכים, כפולות בקובץ (כולל הבדלי רישיות ורווחים), שורות ריקות מדולגות, מספרי שורות נכונים, `buildPreview` (חדשה / עדכון / קמפיין חדש, התאמת קמפיין בלי רישיות).
- `tests/unit/import-parse.test.ts` — CSV עם BOM ובלי, Windows-1255, XLSX עם תאי תאריך ומספר, סוג לא נתמך, חתימה לא תואמת לסיומת, ריק, מעל 5,000 שורות, קובץ הדוגמה עובר את כל הצינור בלי שגיאות.
- `tests/integration/imports.test.ts` (משתמש B, מול `budgi-dev`) — `commit_import` יוצר קמפיינים ושבועות; ייבוא חוזר לא יוצר כפילויות; שדה `null` לא דורס ערך קיים; `source` מתעדכן ל-`import`; קמפיין קיים בהבדלי רישיות לא נוצר שוב; שורה לא חוקית אחת (למשל ערך שלילי שנשלח ישירות) מבטלת את כל הייבוא — לא נוצר אף קמפיין; נרשמת שורת `import_jobs` עם המונים הנכונים.
- `tests/rls/rls.test.ts` — הרחבה: B לא רואה את `import_jobs` של A ולא יכול להוסיף לו שורה; אנונימי לא יכול להריץ `commit_import`.
- `tests/e2e/imports.spec.ts` (desktop + mobile) — הורדת קובץ הדוגמה והעלאתו כמו שהוא → זיהוי אוטומטי → תצוגה מקדימה → ייבוא → הקמפיינים החדשים מופיעים במסך הקמפיינים; ייבוא חוזר של אותו קובץ → 0 חדשות, רק עדכונים, בלי קמפיינים חדשים; קובץ עם כותרות אחרות → שלב התאמה, „המשך” כבוי עד ששדות החובה נבחרו; קובץ עם שגיאות → מספרי שורות וסיבות, והשורות השגויות לא נשמרו; הודעת תאריך שהותאם; קובץ ריק / `.txt` / מעל 5MB → הודעה מתחת לאזור הגרירה; קמפיינים חדשים לא נוצרים לפני אישור (בדיקה אחרי „חזרה”).

### מסמכים
- `spec/ARCHITECTURE.md` — ADR-8: זרימת ייבוא בלי שמירת קובץ (שליחה חוזרת + אימות מחדש ב-commit), שמירה דרך פונקציית SQL בטרנזקציה, SheetJS מהמקור הרשמי ו-`papaparse`, קידוד Windows-1255, ומגבלת 4.5MB של Vercel.
- `spec/MILESTONES.md` — 🟡 ליד Milestone 4 בסיום הבנייה.

## 5. סדר עבודה

1. קריאת מסמכי Next.js הרלוונטיים (Route Handlers, `formData`, הורדת קובץ).
2. Migration → החלה על `budgi-dev` → `get_advisors` → בדיקת חשיפה ב-Data API (אם צריך — עצירה והדרכה) → Types.
3. התקנת SheetJS (מהמקור הרשמי) ו-`papaparse`.
4. lib: `parseNumber`, נרמול, התאמה, ולידציית שורות, תצוגה מקדימה + בדיקות Unit.
5. server: פענוח קובץ, קובץ דוגמה, repository ו-service + בדיקות Unit, Integration ו-RLS.
6. Route Handlers.
7. ממשק: מחוון, ארבעת השלבים, `ImportWizard`, המסך.
8. Playwright, ואז `lint`, `typecheck`, `test`, `test:e2e`, `build`.
9. בדיקה ידנית שלי בדפדפן (מחשב ומובייל, RTL, מקלדת, קובץ CSV שנשמר מ-Excel בעברית), סגירת ההרצה, ADR-8 ו-🟡.

## 6. מה נדרש ממך במהלך הבנייה

- כנראה כלום. אם הטבלה או הפונקציה החדשות לא ייחשפו אוטומטית ב-Data API של Supabase — אעצור ואדריך אותך לסמן אותן בהגדרות (כמה לחיצות).

## 7. בדיקה מול ה-Definition of Done

| תנאי | איך נבדק |
|---|---|
| העלאת CSV ו-XLSX תקינים; קובץ הדוגמה מיובא בלי שינויים | Unit (פענוח שני הסוגים, קובץ הדוגמה בכל הצינור) + E2E (הורדה והעלאה של קובץ הדוגמה; XLSX שנוצר בבדיקה) |
| קובץ עם כותרות אחרות מיובא אחרי התאמה ידנית | Unit (`suggestMapping`, `validateMapping`) + E2E |
| התצוגה המקדימה נכונה: חדשות, עדכונים, קמפיינים חדשים ושגיאות | Unit (`buildPreview`, `validateRows`) + E2E |
| קמפיינים חדשים נוצרים רק אחרי אישור | הזרימה (preview לא כותב ל-DB) + E2E (חזרה בלי אישור → אין קמפיין) + Integration |
| ייבוא חוזר מעדכן בלי כפילויות; שדה ריק לא דורס | Unique ב-DB + `coalesce` ב-`commit_import` + Integration + E2E |
| שורות שגויות מדווחות עם מספר שורה וסיבה בעברית ולא נשמרות | Unit + E2E |
| קובץ לא נתמך, ריק או גדול מהמגבלה — הודעה ברורה | Unit (`readImportFile`) + E2E |
| בדיקות Unit, Integration ו-Playwright של ייבוא תקין ושגוי עוברות | `npm test`, `npm run test:e2e` |
| ה-Migrations הורצו ונבדקו ב-`budgi-dev` | `list_migrations` + כל הבדיקות מול `budgi-dev` |
