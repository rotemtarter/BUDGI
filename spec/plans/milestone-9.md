# Milestone 9 — הקשחה, פרטיות, נגישות ופריסה ל-Production: תוכנית

מקורות: PRD 4.1, 4.9, 5.1, 5.6; ARCHITECTURE 2.2 (Account Service), 2.3, 6.1, 6.2, 6.5, 7.1–7.7, 8.1, 8.2, ADR-2–ADR-14; DESIGN „סטיות מאושרות”, 1.1, 1.10 (אזור 6), 1.13, 1.14, 1.15, 2.5; MILESTONES (Milestone 9).

## 1. סקירה

אבן הדרך האחרונה, בשני חלקים שונים מאוד:

- **חלק א — קוד, מקומי ו-`budgi-dev` בלבד:** מחיקת חשבון, דפים משפטיים, נגישות, מצבי שגיאה, בדיקות End-to-End מלאות, בדיקות Responsive ובדיקות קצה, ובדיקת Secrets. נבנה ונבדק כמו כל אבן דרך קודמת, ומסתיים בבדיקה שלך.
- **חלק ב — Production:** הקמת `budgi-prod`, Google OAuth ל-Production, משתני Production ב-Vercel, הרצת ה-Migrations על `budgi-prod`, עדכון ענף `production`, ו-Smoke Tests. כל צעד כאן הוא פעולה שלך בשירות חיצוני (בהדרכה) או פעולה שדורשת את האישור המפורש שלך. אין בחלק הזה קוד חדש.

אין Migration חדש באבן הדרך (מחיקה ב-Cascade כבר קיימת בכל הטבלאות — נבדק ב-`supabase/migrations/`).

## 2. החלטות

### 2.1 החלטות טכניות (יתועדו ב-ADR-15)
1. **מחיקת חשבון ב-Route Handler** `DELETE /api/account` (ARCHITECTURE 6.5), בסדר הזה:
   1. אימות Session (`getClaims`) → מזהה המשתמש. בלי Session → 401.
   2. בדיקת גוף הבקשה: `{ confirm: "מחק" }` (Zod) — הגנה כפולה על הקלדת המילה גם בשרת. אחרת → 400.
   3. `auth.admin.deleteUser(userId)` עם Service Role Key, בלקוח Supabase נפרד בצד השרת בלבד (`src/lib/supabase/admin.ts`, `server-only`). כל נתוני העסק נמחקים ב-Cascade (כולל `campaign_performance`, ADR-7).
   4. `signOut({ scope: "local" })` לניקוי ה-Cookies בדפדפן הזה. כשל כאן אינו מכשיל את המחיקה.
   5. תשובה 200; הדפדפן מעביר ל-`/login` (PRD 4.9).
   - כשל במחיקה → 500 עם הודעה בעברית „מחיקת החשבון נכשלה. נסה שוב.”, ונשאר במסך. ללוג נכתב רק קוד השגיאה ו-Request ID (ARCHITECTURE 8.2), בלי פרטי משתמש.
   - `SUPABASE_SERVICE_ROLE_KEY` משמש **רק** בקובץ הזה (ARCHITECTURE 6.2). בדיקת קוד אוטומטית (בבדיקת ה-Secrets, 4.6) מוודאת שאין לו שימוש אחר ושאין לו prefix של `NEXT_PUBLIC_`.
   - בשאר המכשירים של המשתמש: ה-Session מפסיק לעבוד ברענון הבא, וכל הנתונים כבר נמחקו, כך שאין מה להציג. השרת ממילא מוודא שקיים `profile` (ראו 2.1.2).
2. **Session של משתמש שנמחק:** `getCurrentUser` מחזיר `null` אם אין שורת `profiles` למשתמש (היום הוא מחזיר משתמש שלא השלים הגדרה ראשונית). כך מכשיר אחר עם Session ישן מגיע למסך ההתחברות ולא להגדרה הראשונית.
3. **בדיקת מחיקת חשבון בלי לפגוע במשתמשי הבדיקה:** אסור למחוק את משתמשי הבדיקה A ו-B. בדיקות המחיקה (Integration ו-Playwright) יוצרות **משתמש זמני** ב-`budgi-dev` דרך ה-Admin API (Email/Password, אימייל מאושר, סיסמה אקראית שלא מודפסת), ממלאות לו נתונים בכל הטבלאות (תקציב, יעד, קמפיין, שבוע, תקציב קמפיין, התראה, תובנה, ייבוא), מוחקות אותו דרך האפליקציה, ובודקות שאין לו אף שורה ושאין משתמש ב-`auth.users`. אם הבדיקה נכשלת באמצע — `afterAll` מוחק את המשתמש הזמני.
4. **נגישות:** `@axe-core/playwright` (devDependency), תגיות `wcag2a` + `wcag2aa` (WCAG 2.0 AA, DESIGN 2.5). הבדיקה נכשלת על ממצא `serious` או `critical`; ממצאים `moderate`/`minor` מתוקנים אם פשוט, ומדווחים בסיכום אם לא.
5. **מצבי שגיאה (DESIGN 1.14):** היום אין דף שגיאה — כשל של Supabase מציג את דף השגיאה הכללי של Next.js באנגלית. נוסף `error.tsx` בתוך ה-Shell (כרטיס שגיאה בעברית + „נסה שוב”), `global-error.tsx` לשגיאה מחוץ ל-Shell, ו-`not-found.tsx` (כתובת שלא קיימת) באותו סגנון של כרטיס שגיאה בעברית עם קישור „חזרה למסך הבית”. אלה מצבי שגיאה לפי 1.14, לא מסכים חדשים.
6. **Google OAuth ל-Production:** OAuth Client **נפרד** ב-Google Cloud ל-`budgi-prod` (ARCHITECTURE 6.1, 7.2: מפתחות נפרדים לכל סביבה), ו-Consent Screen במצב „In production” (במצב Testing רק משתמשים שהוזנו ידנית יכולים להתחבר). Budgi מבקשת רק שם, אימייל ותמונה — הרשאות בסיסיות שאינן דורשות תהליך אימות של Google.
7. **Migrations על `budgi-prod`:** דרך Supabase MCP (`apply_migration`, כמו ב-`budgi-dev`, ADR-6), כל 11 הקבצים שב-`supabase/migrations/` לפי הסדר, עם אותם שמות. אחרי ההרצה: השוואת טבלאות, פונקציות ו-Policies בין `budgi-dev` ל-`budgi-prod` (`list_tables`, `list_migrations`), ובדיקת `get_advisors` (אבטחה) על `budgi-prod`. **רק אחרי אישור מפורש שלך.**
8. **Smoke Tests ב-Production:** ב-`budgi-prod` אין משתמשי בדיקה (Email/Password כבוי), ולכן:
   - **אוטומטי (אני מריץ):** הכתובת החיה נטענת; `/login`, `/terms`, `/privacy` עונים; מסך פנימי בלי התחברות מפנה ל-`/login`; כותרות האבטחה קיימות; כפתור Google מפנה לפרויקט `budgi-prod` ולא ל-`budgi-dev`; ובהגדרות ה-Auth הציבוריות של `budgi-prod` — Google פעיל ו-Email כבוי.
   - **ידני (אתה, בהדרכה):** התחברות Google, הגדרה ראשונית, יצירת קמפיין והזנת שבוע, בדיקה שהמדדים במסך הבית נכונים, שאלה אחת ל-AI, ובסוף — אם תרצה — מחיקת החשבון שיצרת לבדיקה (שהיא גם בדיקה של המחיקה ב-Production).

### 2.2 החלטות שצריך ממך (ראו גם סעיף 7)
- הנוסח של תנאי השימוש ומדיניות הפרטיות.
- דומיין משלך — כן/לא.
- תוכנית Supabase ל-`budgi-prod`: Free או Pro.
- סדר הסימונים ✅ באבן הדרך הזו (סעיף 6).

## 3. קבצים

### חדשים
| קובץ | תוכן |
|---|---|
| `src/lib/supabase/admin.ts` | לקוח Supabase עם Service Role Key, `server-only`, בלי Session. שגיאה ברורה אם המשתנה חסר. |
| `src/app/api/account/route.ts` | `DELETE` לפי 2.1.1. |
| `src/features/account/delete-account.tsx` | כרטיס „אזור מסוכן” + חלונית ההקלדה (Client). |
| `src/lib/validation/account.ts` | סכמת Zod של אישור המחיקה (`"מחק"`, אחרי `trim`). |
| `src/app/(app)/error.tsx` | כרטיס שגיאה + „נסה שוב” (`reset`). |
| `src/app/global-error.tsx` | אותו כרטיס, עם `<html lang="he" dir="rtl">`. |
| `src/app/not-found.tsx` | „הדף לא נמצא” + קישור למסך הבית. |
| `src/components/common/error-card.tsx` | הכרטיס המשותף לשלושת הקבצים. |
| `src/components/shell/skip-link.tsx` | קישור „דילוג לתוכן הראשי” (אם axe או בדיקת המקלדת מראים שחסר; ראו 4.3). |
| `tests/integration/account-deletion.test.ts` | משתמש זמני → מחיקה דרך `DELETE /api/account` הלוגי (פונקציית השירות) → אין שורות. |
| `tests/support/temp-user.ts` | יצירה ומחיקה של משתמש זמני ב-`budgi-dev` (Admin API), ומילוי נתונים בכל הטבלאות. |
| `tests/e2e/account-deletion.spec.ts` | מחיקת חשבון מקצה לקצה דרך המסך (2.1.3). |
| `tests/e2e/accessibility.spec.ts` | axe בכל המסכים + בדיקות מקלדת (4.3). |
| `tests/e2e/responsive.spec.ts` | כל המסכים ב-Desktop, Tablet ו-Mobile, ובהגדלת טקסט (4.4). |
| `tests/e2e/full-flow.spec.ts` | זרימה מלאה של משתמש חדש (4.5). |
| `tests/e2e/edge-cases.spec.ts` | מצבי קצה שעוד לא מכוסים (4.5). |
| `tests/unit/account-validation.test.ts` | „מחק”, רווחים, מילה אחרת, ריק. |
| `scripts/check-secrets.mjs` | בדיקת Secrets (4.6), מורץ גם כ-`npm run check:secrets`. |

### משתנים
| קובץ | שינוי |
|---|---|
| `src/app/(app)/settings/page.tsx` | מוסיף את אזור 6 (מחיקת חשבון) אחרי „יציאה”; מסיר את ההערה „M9 is added later”. |
| `src/server/auth/session.ts` | 2.1.2 — בלי `profile` → `null`. |
| `src/app/(legal)/terms/page.tsx`, `privacy/page.tsx` | הנוסח שתספק (אם יסופק), בכותרות H2 ופסקאות; אחרת ללא שינוי. |
| `src/app/(app)/layout.tsx`, רכיבי ה-Shell | תיקוני נגישות שיימצאו (Landmarks, `aria-label`, Focus). |
| רכיבים שונים | תיקוני ממצאי axe, Responsive ו-BiDi. |
| `playwright.config.ts` | פרויקט `tablet` (iPad, 768px) שמריץ רק את `responsive.spec.ts` ו-`accessibility.spec.ts`. |
| `package.json` | `@axe-core/playwright` (dev), סקריפט `check:secrets`. |
| `.env.example` | `SUPABASE_SERVICE_ROLE_KEY=` (שם בלבד). |
| `CLAUDE.md` | פקודת הבדיקה החדשה ב„פקודות הרצה”. |
| `spec/ARCHITECTURE.md` | ADR-15 (מחיקת חשבון, Production). |
| `spec/MILESTONES.md` | סימוני התקדמות בלבד. |

## 4. מימוש — חלק א

### 4.1 מחיקת חשבון (DESIGN 1.10 אזור 6, PRD 4.9)
- **כרטיס „אזור מסוכן”** — האחרון במסך ההגדרות, גבול אדום (`destructive`), כותרת „מחיקת חשבון”, הסבר: „המחיקה סופית: החשבון וכל הנתונים — קמפיינים, נתונים שבועיים, תקציבים, יעדים, התראות ותובנות שמורות — יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם.” וכפתור `destructive` „מחיקת החשבון”.
- **חלונית** (AlertDialog, כמו `ConfirmDialog`): כותרת „למחוק את החשבון?”, אותו הסבר בקצרה, שדה עם תווית „כדי לאשר, הקלד: מחק”. כפתור „מחיקה לצמיתות” מושבת עד שהשדה שווה ל-„מחק” (אחרי `trim`). בזמן המחיקה: „מוחק…”, והחלונית לא נסגרת. כשל → Toast אדום עם ההודעה מהשרת והחלונית נשארת פתוחה. הצלחה → `window.location.assign("/login")` (טעינה מלאה, כדי שלא יישאר מצב ישן בזיכרון).
- **נגישות:** Focus עובר לשדה בפתיחה, Escape סוגר (כשלא בזמן מחיקה), ההודעות מוכרזות.

### 4.2 דפים משפטיים (DESIGN 1.13)
- הדפים כבר קיימים ונגישים ממסך ההתחברות ומההגדרות (נבדק בקוד ובבדיקות `public-pages`). אם תספק נוסח — הוא נכנס כפי שהוא, בלי שינוי תוכן מצידי. אם לא — נשאר „התוכן יעודכן בקרוב.” וזה יצוין בסיכום ובמגבלות הידועות.

### 4.3 נגישות (DESIGN 2.5, ARCHITECTURE 8.1)
- **axe אוטומטי** על כל מסך, במצב עם נתונים ובמצב ריק: התחברות, תנאי שימוש, פרטיות, הגדרה ראשונית, בית (חודש ושבוע), קמפיינים, קמפיין חדש, פרטי קמפיין, תקציב (שתי הלשוניות), מדדים, תחזית, התראות, ייבוא (שלב 1, ושלבי התאמה/תצוגה מקדימה עם קובץ הדוגמה), Advisor (פתיחה ותשובה עם Mock), הגדרות; ובנוסף כשהחלונות פתוחים: הזנת שבוע, אישור מחיקה, מחיקת חשבון, מגירת המובייל.
- **מקלדת (אוטומטי):** Tab מגיע לכל פריטי הניווט וה-Focus גלוי (בדיקת `outline`/`box-shadow` מחושב); מגירת המובייל נפתחת ב-Enter, נסגרת ב-Escape, וה-Focus חוזר לכפתור ☰; טופס הזנת שבוע ניתן למילוי ולשמירה במקלדת בלבד; חלונית מחיקת החשבון ניתנת להשלמה במקלדת בלבד.
- **קישור דילוג:** אם חסר, נוסף „דילוג לתוכן הראשי” בתחילת ה-Shell (מוסתר עד שמקבל Focus).
- **ידני (אני בודק, ובנוסף רשימה קצרה לבדיקה שלך):** מעבר על כל המסכים במקלדת בלבד, וגרפים — שיש להם טבלה נסתרת לקוראי מסך (ADR-9).
- ממצאים שלא תוקנו (אם יהיו) יפורטו בסיכום, עם הסבר למה.

### 4.4 Responsive, RTL, מספרים ותאריכים
- `responsive.spec.ts` עובר על כל המסכים בשלושה גדלים: Desktop (1440), Tablet (768) ו-Mobile (Pixel 7), ומוודא: אין גלילה אופקית בעמוד (`scrollWidth <= clientWidth`, למעט טבלאות בתוך מיכל גלילה ייעודי), הסרגל הצדדי במחשב/טאבלט והמגירה במובייל (DESIGN 1.15).
- **הגדלת טקסט 200%:** אותה בדיקה ברוחב 640px עם גופן בסיס כפול (הדמיה של הגדלה ל-200%).
- **RTL ו-BiDi:** בדיקה ידנית (צילומי מסך) של סכומי ₪, אחוזים, תאריכים DD.MM / DD/MM/YYYY ושמות באנגלית בכל המסכים, ותיקון מה שמתהפך.

### 4.5 בדיקות End-to-End וקצה
- **`full-flow.spec.ts`** — משתמש A אחרי איפוס: הגדרה ראשונית → קמפיין חדש → הזנת שבוע → מסך הבית מציג את הסכומים → ייבוא קובץ הדוגמה → התראה מופיעה בפעמון ובמסך ההתראות → תחזית → שאלה ל-Advisor (Mock, ADR-12) ושמירת תובנה → הגדרות.
- **`edge-cases.spec.ts`** — מה שעוד לא מכוסה בבדיקות הקיימות (ייבוא שגוי, ריק, גדול ולא נתמך כבר מכוסה ב-`imports.spec.ts`; כשלי OpenAI ב-`advisor.spec.ts` וב-Unit): כתובת שלא קיימת → „הדף לא נמצא”; מזהה קמפיין לא קיים / של משתמש B → „הדף לא נמצא”; ערכי URL לא תקינים בבוררי התקופה → החודש הנוכחי; Advisor שמחזיר 500 / 429 / 409 → הודעות בעברית.
- **כשל Supabase:** אי אפשר לדמות אותו בבדיקה אוטומטית (הקריאה נעשית בשרת). נבדק ידנית פעם אחת בהרצה מקומית עם כתובת Supabase שגויה בהרצה זמנית (משתנה סביבה בפקודת ההרצה בלבד, בלי לגעת ב-`.env`): כרטיס השגיאה בעברית מוצג, בלי פרטים טכניים.
- **הרצה מלאה:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` — הכול עובר.

### 4.6 בדיקת Secrets
`scripts/check-secrets.mjs` (לא קורא את `.env`):
- מחפש בכל הקבצים שב-Git ובכל היסטוריית ה-Git דפוסים של מפתחות (`sk-`, `sb_secret_`, JWT של `service_role`, `-----BEGIN`).
- מחפש באותם דפוסים בקובצי הדפדפן אחרי Build (`.next/static`), וגם את השמות `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_USER_`.
- מוודא ש-`SUPABASE_SERVICE_ROLE_KEY` מופיע בקוד רק ב-`src/lib/supabase/admin.ts`, ש-`OPENAI_API_KEY` רק בקוד שרת, ושאין משתני `NEXT_PUBLIC_` מלבד שני משתני Supabase הציבוריים.
- בנוסף: `npm audit --omit=dev` נקי (ADR-14).

### 4.7 `.env`
- `SUPABASE_SERVICE_ROLE_KEY` נוסף ל-`.env.example`. אדריך אותך להעתיק את ה-Secret Key של **`budgi-dev`** מ-Supabase אל ה-`.env` שלך (לא בצ'אט), ולהוסיף אותו גם למשתני **Preview** ב-Vercel (כדי שמחיקת חשבון תעבוד גם בגרסת ה-Preview).

## 5. מימוש — חלק ב: Production (ARCHITECTURE 7.4, 7.5, 7.6)

כל צעד הוא פעולה שלך בהדרכה צעד אחר צעד, או פעולה שלי שדורשת את האישור המפורש שלך. אני לא רואה ולא מקבל אף Secret של Production — הם עוברים ישר מ-Supabase/Google/OpenAI ל-Vercel.

1. **Preview:** אחרי שאישרת את חלק א, דחיפה ל-`main` (בפקודה „דחוף”), ובדיקה שלך של גרסת ה-Preview.
2. **`budgi-prod`:** פתיחת פרויקט Supabase חדש (באותו Region של `budgi-dev`, ובתוכנית שתבחר). שמירת סיסמת ה-DB במקום בטוח אצלך.
3. **Migrations — דורש אישור מפורש שלך:** הרצת 11 ה-Migrations על `budgi-prod` (2.1.7), השוואה ל-`budgi-dev` ובדיקת אבטחה.
4. **הגדרות שלא עוברות ב-Migrations (7.6, ADR-6):** חשיפת הטבלאות והפונקציות ב-Data API (אם לא נחשפו אוטומטית), ספק Email/Password **כבוי**, Site URL ו-Redirect URL של כתובת ה-Production.
5. **Google:** OAuth Client חדש ל-Production, Redirect URI של `budgi-prod`, הזנת Client ID/Secret ב-`budgi-prod`, ו-Consent Screen במצב „In production” (2.1.6).
6. **OpenAI:** מפתח נפרד ל-Production ותקרת הוצאה חודשית.
7. **Vercel — משתני Production בלבד:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (של `budgi-prod`), `OPENAI_API_KEY` (של Production), `APP_ENV=production`. בלי משתני `E2E_*`. אני בודק איתך שאף משתנה של Production לא סומן גם ל-Preview.
8. **דומיין (אם בחרת):** חיבור ב-Vercel ועדכון ה-DNS אצל רשם הדומיין, ואז עדכון ה-Site URL ב-Supabase וה-Redirect ב-Google לכתובת הזו.
9. **עדכון `production` — דורש אישור מפורש שלך:** רק אחרי שצעד 3 הצליח — `git push origin main:production` (הענף כבר קיים, ADR-5). Vercel יוצר את ה-Production Deployment.
10. **Smoke Tests** (2.1.8) — אוטומטיים שלי ואז ידניים שלך.
11. **סיכום פריסה:** כתובת האתר, היכן כל פרטי הגישה נשמרים, מגבלות ידועות (סעיף 8), ואיך מקדמים גרסה בעתיד: אבן דרך / תיקון ← דחיפה ל-`main` ← בדיקה ב-Preview ← (אם יש Migration חדש — הרצה על `budgi-prod` באישורך) ← עדכון `production` באישורך ← Smoke Test.

אם צעד נכשל (למשל Migration) — עוצרים, לא מעדכנים את `production`, ומתקנים קודם.

## 6. סדר הסימונים — דורש החלטה שלך

ה-Definition of Done של אבן הדרך כולל את הפריסה ל-Production, אבל לפי `CLAUDE.md` „דחוף” מסמן ✅ — וכאן צריך לדחוף ל-`main` **לפני** הפריסה.

**ההצעה שלי:** בסיום חלק א אני מסמן 🟡. ה„דחוף” הראשון שולח ל-`main` (Preview) **בלי** לסמן ✅. את ה-✅ אני מסמן רק אחרי שכל חלק ב עבר (כולל Smoke Tests), ב-commit קטן אחרון שנדחף ל-`main` ול-`production` באישורך.

## 7. שאלות פתוחות

1. **נוסח משפטי:** יש לך כבר תנאי שימוש ומדיניות פרטיות? אם כן — שלח אותם (קובץ או טקסט). אם לא — הדפים יישארו עם „התוכן יעודכן בקרוב.” (מותר לפי ה-Milestone). חשוב: באתר חי עם משתמשים אמיתיים מומלץ שיהיה נוסח לפני השקה, ו-Google עשויה לבקש קישור למדיניות פרטיות ב-Consent Screen.
2. **דומיין:** יש דומיין שתרצה לחבר (למשל `budgi.co.il`)? אם לא — האתר יהיה בכתובת חינמית של Vercel (`…vercel.app`), ואפשר להוסיף דומיין בהמשך.
3. **תוכנית Supabase ל-`budgi-prod`:**
   - **Free** — בלי עלות, אבל פרויקט שאין בו פעילות כשבוע **נעצר**, והאתר לא עובד עד שמחדשים אותו ידנית; בלי גיבויים יומיים.
   - **Pro** — כ-$25 לחודש (לכל ה-Organization; ייתכן תוספת Compute), לא נעצר, וכולל גיבויים.
   - ההמלצה ב-ARCHITECTURE 7.7: תוכנית בתשלום למוצר אמיתי. אם זה לבדיקות עם משתמשים בודדים — Free מספיק להתחלה.
4. **סדר הסימונים** — לפי ההצעה בסעיף 6, או אחרת.

שאלות 1–2 צריכות תשובה לפני הבנייה (חלק א / צעד 8). שאלה 3 — לפני צעד 2 בחלק ב.

## 8. מגבלות ידועות (ייכנסו לסיכום הפריסה)
- מחיקה ופתיחה מחדש של חשבון מאפסות את מונה 20 השאלות היומי של ה-AI (המונה נמחק עם החשבון).
- במכשיר אחר שבו המשתמש היה מחובר, הנתונים כבר אינם נגישים מיד, וה-Session נסגר בבקשה הבאה.
- כשל של Supabase מוצג ככרטיס שגיאה כללי, בלי אבחון.
- כותרת CSP מלאה (Scripts) לא נוספה (ADR-14).
- גרסאות Preview ו-Production שונות רק במשתנים — Preview תמיד מחובר ל-`budgi-dev`.

## 9. Definition of Done — איך כל תנאי ייבדק

| תנאי | בדיקה |
|---|---|
| מחיקת חשבון מוחקת את המשתמש ואת כל נתוניו (`budgi-dev`) | Integration + Playwright עם משתמש זמני; ספירת שורות בכל הטבלאות ובדיקה ב-`auth.users` |
| דפים משפטיים נגישים מההתחברות ומההגדרות | `public-pages.spec.ts` + בדיקה חדשה בהגדרות |
| axe בלי שגיאות חמורות, כל הפעולות במקלדת | `accessibility.spec.ts` + בדיקה ידנית |
| E2E ו-Unit/Integration עוברים | הרצה מלאה של כל הבדיקות |
| Responsive, RTL, מספרים, מטבע ותאריכים | `responsive.spec.ts` (3 גדלים + 200%) + צילומי מסך |
| אין Secrets בקוד, ב-Git או ב-Client bundle | `npm run check:secrets` + `npm audit --omit=dev` |
| Email/Password כבוי ב-`budgi-prod` | הגדרות ה-Auth הציבוריות של `budgi-prod` (Smoke אוטומטי) + צילום מסך שלך מהדשבורד |
| אישור מפורש לעדכון Production | תשובה שלך בצ'אט לפני צעדים 3 ו-9 |
| Migrations על `budgi-prod` לפני `production` | `list_migrations` על `budgi-prod` (11) לפני ה-push |
| Production משתמש בפרטי Production בלבד | כפתור Google מפנה ל-`budgi-prod`; בדיקת משתני Vercel איתך |
| Smoke Tests (התחברות, נתונים, שמירה, חישובים, AI) | אוטומטי + ידני (2.1.8) |
| סיכום פריסה, מגבלות ואיך לקדם גרסאות | הסיכום בסוף צעד 11 |
