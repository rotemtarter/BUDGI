# תוכנית — Milestone 1: הקמת הפרויקט ותשתיות

> מקורות: `MILESTONES.md` (Milestone 1), `ARCHITECTURE.md` (1, 2.3, 6.1, 7.1–7.5, 8.1, ADR-2, ADR-3), `DESIGN.md` (2.1–2.5, 1.15 לגבי RTL), `PRD.md` 3.1 ו-5.6 (עברית, RTL, ₪).
> אין באבן הדרך הזו פיצ'רים עסקיים, טבלאות, Migrations או התחברות.

## 1. מטרה ותוצר

בסוף אבן הדרך:
- אפליקציית Next.js שנבנית ורצה מקומית, בעברית וב-RTL, עם בסיס עיצובי של Budgi.
- דף זמני אחד (`/`) עם הלוגו, הסלוגן „ניהול חכם של תקציב השיווק”, דוגמאות קטנות של רכיבי הבסיס, ושורת סטטוס שמראה שהאפליקציה מחוברת ל-`budgi-dev`.
- פרויקט Supabase `budgi-dev` קיים, ופרטי החיבור שלו נמצאים ב-`.env` (המשתמש ממלא).
- Vitest ו-Playwright מוגדרים, עם בדיקה בסיסית שעוברת בכל אחד.
- (בשלב הדחיפה) פרויקט Vercel מחובר ל-GitHub, Production Branch = `production`, משתני Preview של `budgi-dev`, וגרסת Preview עובדת.

## 2. החלטות טכניות לאבן הדרך

| נושא | החלטה | הסבר קצר |
|---|---|---|
| מנהל חבילות | `npm` | מותקן במחשב (Node 24, npm 11); אין pnpm |
| יצירת הפרויקט | `create-next-app@latest` עם TypeScript, Tailwind, ESLint, App Router, תיקיית `src/`, alias `@/*` | ברירות המחדל הרשמיות; גרסאות מדויקות ננעלות ב-`package-lock.json` |
| רכיבי UI | `shadcn/ui` (init + `button`, `input`, `label`, `card`) עם אייקוני Lucide | לפי ARCHITECTURE 1.1 ו-DESIGN 2.3 |
| גופנים | `next/font/google`: Plus Jakarta Sans (latin) + Rubik (hebrew, latin) | DESIGN 2.2 — נטענים מ-Google Fonts, מוגשים מהשרת שלנו |
| Supabase CLI | שימוש דרך `npx supabase` כשיידרש (מ-M2) — לא מתקינים גלובלית | CLI לא מותקן; אין Docker ואין DB מקומי |
| חיבור Supabase ב-M1 | בדיקת חיבור קלה מצד השרת (פנייה ל-Auth API של `budgi-dev` עם ה-Publishable/Anon key) | מוכיח שה-URL והמפתח נכונים, בלי טבלאות. ספריות `@supabase/ssr`/`supabase-js` יותקנו ב-M2 יחד עם ההתחברות |
| לוגו | עותק זהה של `spec/logo.png` ב-`public/brand/logo.png`, **כמו שהוא — כולל השורה באנגלית** „Spend Smart. Grow Smarter.” | החלטת המשתמש. מתחת ללוגו מופיע בנוסף הסלוגן העברי „ניהול חכם של תקציב השיווק” (DESIGN) |
| Vercel ללא Production Deployment | יצירת הפרויקט וחיבורו ל-Git בלי Deployment ראשון, ורק אז שינוי Production Branch ל-`production` (פרטים בסעיף 7) | ייבוא רגיל דרך הדשבורד מבצע מיד Production Deployment מ-`main`, וזה סותר את ה-DoD ואת ADR-2 |

ההחלטה על חיבור Vercel תתועד כ-ADR-4 ב-ARCHITECTURE.md במהלך הבנייה.

## 3. קבצים ליצירה / שינוי

### יצירת הפרויקט
`create-next-app` מסרב לרוץ בתיקייה שאינה ריקה — ניצור אותו בתיקייה זמנית (scratchpad) ונעתיק את הקבצים לשורש. **לא דורסים** `.gitignore`, `CLAUDE.md`, `spec/`. מוחקים את קבצי הדוגמה של Next (`public/*.svg`, `favicon.ico` של Next) ואת `README.md` הגנרי (או מחליפים בקצר).

### מבנה תיקיות (לפי ARCHITECTURE 2.3 — רק מה שנדרש עכשיו)
```text
src/
  app/
    layout.tsx          # <html lang="he" dir="rtl">, fonts, metadata
    page.tsx            # temporary page (logo, slogan, component samples, DB status)
    globals.css         # Tailwind + brand tokens
  components/
    ui/                 # shadcn: button, input, label, card (customized)
    brand/
      logo.tsx          # next/image wrapper for the logo
  lib/
    utils.ts            # shadcn cn()
    supabase/
      health.ts         # server-only connection check
public/
  brand/logo.png        # exact copy of spec/logo.png (with English tagline)
supabase/
  migrations/.gitkeep   # empty; first migration arrives in M2
tests/
  unit/utils.test.ts
  integration/supabase-connection.test.ts
  e2e/home.spec.ts
vitest.config.ts
playwright.config.ts
.env.example
```
שאר התיקיות מ-2.3 (`features/`, `server/`, route groups וכו') ייווצרו באבני הדרך שצריכות אותן.

### `package.json` — scripts
- `dev`, `build`, `start`, `lint` (מ-create-next-app)
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`
- `test:e2e`: `playwright test`

### `.gitignore`
כבר מכסה `.env`, `.next/`, `.vercel/`, `playwright-report/`, `test-results/`, `coverage/`. להוסיף רק אם יתגלה צורך (למשל `next-env.d.ts` — **לא** מוסיפים; הוא נשמר ב-Git לפי ברירת המחדל של Next). לא מסירים שום שורה.

## 4. בסיס עיצובי (DESIGN 2.1–2.5)

### `globals.css` — Tokens
- צבעי מותג כמשתני CSS + `@theme` של Tailwind: `purple #6B3BFF`, `violet #8B5CFF`, `indigo #A78BFA`, `blue #00C6FF`, `light-blue #E6F7FF`, `dark #1E1B4B`, `gray #6B7280`, `light-gray #E5E7EB`, `background #F8FAFC`; סטטוס: `success #15803D`, `warning #B45309`, `error #DC2626`.
- מיפוי ל-tokens של shadcn: `--primary` = Purple, `--foreground` = Dark, `--muted-foreground` = Gray, `--border`/`--input` = Light Gray, `--ring` = Purple, `--destructive` = Error, `--background` = Background, `--card` = לבן.
- Gradients: `--gradient-button: linear-gradient(#5A2EE8 → #7C4DFF)` (כפתור ראשי ורקע מתחת לטקסט לבן בלבד), `--gradient-purple` (דקורטיבי), `--gradient-blue`.
- Shadows: card `0 4px 16px rgba(107,59,255,.08)`, button `0 4px 12px rgba(107,59,255,.2)`, modal `0 8px 24px rgba(107,59,255,.12)`.
- Radius: 12px לכרטיסים ולכפתורים, 10px לשדות.
- טיפוגרפיה: `font-family: "Plus Jakarta Sans", "Rubik", sans-serif` (דרך משתני `next/font`); מחלקות/סגנונות ל-H1–H4, Body, Small, Caption, Button לפי הטבלה ב-2.2.
- Dark mode: **לא** — המוצר מוגדר בבהיר בלבד; מסירים את בלוק ה-dark של shadcn.

### רכיבים (התאמת קבצי shadcn)
- **Button** — וריאנטים: `default` (Primary: Button Gradient, טקסט לבן, צל כפתור), `secondary` (לבן, גבול סגול עדין, טקסט Purple), `link`/text (טקסט Purple), `destructive` (טקסט/גבול שגיאה). גובה 40px, 44px במובייל. Focus: טבעת Purple 2px. מצבי Hover ו-Disabled ברורים.
- **Input + Label** — רקע לבן, גבול Light Gray, Purple ב-Focus, radius 10px, גובה זהה לכפתור. תווית מעל השדה; כוכבית לשדה חובה. מצב שגיאה (`aria-invalid`) — גבול אדום.
- **Card** — רקע לבן, גבול עדין, radius 12px, Card shadow.
- RTL: בכל התאמה משתמשים במחלקות לוגיות (`ms-`/`me-`/`ps-`/`pe-`/`start`/`end`) ולא `ml`/`mr`/`left`/`right`.

### `layout.tsx`
- `<html lang="he" dir="rtl">`, גופנים על ה-`<html>`, `body` ברקע Background וטקסט Dark.
- `metadata`: title „Budgi”, description „ניהול חכם של תקציב השיווק”.

## 5. הדף הזמני (`src/app/page.tsx`)

דף מרוכז, ללא Shell (ה-Shell נבנה ב-M2). מבנה:
1. **לוגו** (`public/brand/logo.png` כמו שהוא, כולל השורה באנגלית, עם `alt="Budgi"`) ותחתיו הסלוגן „ניהול חכם של תקציב השיווק” (Body/Gray).
2. **כרטיס „בדיקת עיצוב”** (זמני, לצורך בדיקת ה-DoD בלבד):
   - כותרות H1–H4 קצרות בעברית, שורה עם מונחים ומספרים באנגלית (למשל „ROAS 2.3”, `₪12,500` בתוך `dir="ltr"` מקומי) — לבדיקת שני הגופנים וה-BiDi.
   - שלושה כפתורים: ראשי, משני, טקסט.
   - שדה עם תווית (ושדה מושבת), לבדיקת יישור לימין ו-Focus.
3. **שורת סטטוס חיבור** קטנה: „חיבור למסד הנתונים (budgi-dev): תקין” / „לא תקין” / „חסרים פרטי חיבור ב-.env”, עם אייקון (לא רק צבע).

הדף מוגדר `dynamic = "force-dynamic"` כדי שבדיקת החיבור תרוץ בכל טעינה ולא בזמן ה-build (ה-build לא תלוי ב-`.env`).
כל הדף יוחלף/יוסר ב-M2 (מסך ההתחברות ייכנס במקומו).

### `src/lib/supabase/health.ts`
- `import "server-only"`. קורא `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- מחזיר אחד מ: `missing_config` / `ok` / `error`. פונה ל-Auth API של Supabase (`/auth/v1/settings`) עם המפתח בכותרת `apikey`, עם timeout קצר. תשובה תקינה = הכתובת זמינה והמפתח התקבל.
- לא מדפיס מפתחות ללוג ולא מחזיר אותם לדפדפן.

## 6. משתני סביבה

### `.env.example` (שמות בלבד, בלי ערכים)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
APP_ENV=
```
- `OPENAI_API_KEY` יתווסף ב-M8, `E2E_*` ב-M2, `SUPABASE_SERVICE_ROLE_KEY` ב-M9 (ARCHITECTURE 7.2).
- מעתיקים פעם אחת ל-`.env` (`cp .env.example .env`). **Claude לא קורא את `.env`** ולא מבקש להדביק ערכים בצ'אט.

## 7. הדרכות צעד אחר צעד (בשפה פשוטה, המשתמש מבצע)

### 7.1 Supabase — `budgi-dev` (במהלך הבנייה, לפני בדיקת החיבור)
1. כניסה/הרשמה ל-supabase.com (מומלץ עם חשבון GitHub).
2. יצירת Organization (תוכנית Free) ו-New Project בשם `budgi-dev`.
3. סיסמת מסד הנתונים: ליצור אוטומטית ולשמור **במנהל סיסמאות** — לא בצ'אט ולא ב-`.env` (לא נדרשת כרגע).
4. Region: Central EU (Frankfurt) — הקרוב לישראל מבין האפשרויות.
5. אחרי שהפרויקט מוכן: Project Settings → API Keys / Data API — להעתיק את **Project URL** ל-`NEXT_PUBLIC_SUPABASE_URL` ואת ה-**Publishable key** (או anon key) ל-`NEXT_PUBLIC_SUPABASE_ANON_KEY` בקובץ `.env`. `APP_ENV=development`.
6. **לא להעתיק** את ה-Secret / service_role key לשום מקום.
7. להודיע ל-Claude שסיימת → Claude מריץ את בדיקת החיבור.
- הסבר: פרויקט Free שלא נעשה בו שימוש כשבוע עלול להיעצר; מחדשים אותו מהדשבורד.
- לפני כתיבת ההדרכה בפועל — Claude מוודא בתיעוד העדכני של Supabase את שמות המסכים והמפתחות.

### 7.2 Vercel (בשלב הדחיפה, אחרי אישור המשתמש ל-push)
סדר הפעולות נועד למנוע Production Deployment:
1. Push של הקוד ל-`main` ב-GitHub (`rotemtarter/BUDGI`). עדיין אין Vercel, ולכן לא נפרס דבר.
2. המשתמש יוצר חשבון Vercel (Hobby, התחברות עם GitHub) ומאשר ל-Vercel גישה ל-Repository.
3. יצירת פרויקט **בלי Deployment ראשון**: דרך Vercel CLI (`npx vercel login` → `npx vercel link` → `npx vercel git connect`), כשהמשתמש מריץ את הפקודות בטרמינל בעצמו לפי הדרכה. לפני ההדרכה Claude מוודא בתיעוד Vercel העדכני שהפקודות אינן יוצרות Deployment; אם מסך הייבוא בדשבורד מאפשר לבחור Production Branch לפני ה-Deploy — משתמשים בדשבורד במקום. אם אף דרך לא מונעת Deployment ראשון — עוצרים ומתייעצים.
4. Settings → Environments → Production → Branch Tracking: לשנות ל-`production` (ענף שעדיין לא קיים).
5. Settings → Environment Variables: להוסיף `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_ENV=preview` — **מסומנים ל-Preview בלבד**, עם ערכי `budgi-dev`.
6. יצירת Preview: Push נוסף ל-`main` (למשל commit שמעדכן את סימוני ההתקדמות) — באישור המשתמש. Vercel בונה Preview.
7. בדיקה: פתיחת כתובת ה-Preview (המשתמש מחובר ל-Vercel, כי Preview מוגן כברירת מחדל) — הדף הזמני מוצג ושורת הסטטוס מראה „תקין”. ב-Deployments לא מופיע אף Deployment מסוג Production.

### 7.3 הסבר „איפה נשמרים פרטי הגישה” (יימסר למשתמש בסיום)
- **Supabase:** בדשבורד של `budgi-dev`. סיסמת ה-DB — במנהל הסיסמאות.
- **במחשב:** קובץ `.env` בתיקיית הפרויקט; לא עולה ל-GitHub. `.env.example` מכיל שמות בלבד.
- **Vercel:** Settings → Environment Variables של הפרויקט (Preview בלבד בשלב זה).
- **GitHub:** אין שם סודות.

## 8. בדיקות

- **Vitest** (`vitest.config.ts`, סביבת node, alias `@`, טעינת משתני `.env` דרך `loadEnv` של Vite — בלי שהקוד/Claude מדפיסים אותם):
  - `tests/unit/utils.test.ts` — בדיקה בסיסית ל-`cn()`.
  - `tests/integration/supabase-connection.test.ts` — בדיקת החיבור ל-`budgi-dev` מחזירה `ok`.
- **Playwright** (`playwright.config.ts`, Chromium בלבד, `webServer` שמריץ את האפליקציה על פורט מקומי; התקנת הדפדפן: `npx playwright install chromium`):
  - `tests/e2e/home.spec.ts` — הדף נטען; `<html>` עם `lang="he"` ו-`dir="rtl"`; הסלוגן מוצג; הלוגו מוצג; הגופן המחושב של כותרת כולל Plus Jakarta Sans/Rubik; צבע הרקע של הגוף `#F8FAFC`; שורת הסטטוס „תקין”.
- בדיקה ויזואלית ידנית של Claude: צילום מסך בדפדפן המובנה, במחשב ובמובייל (375px).

## 9. סדר הבנייה

1. יצירת Next.js בתיקייה זמנית והעתקה לשורש; `npm install`; וידוא `npm run build`.
2. `shadcn init` + `button`, `input`, `label`, `card`; התאמת tokens, גופנים, RTL וסגנונות הרכיבים.
3. העתקת הלוגו כמו שהוא ל-`public/brand/` + רכיב `Logo`.
4. הדף הזמני + `health.ts`.
5. `.env.example` → העתקה ל-`.env`; **עצירה להדרכת Supabase (7.1)** והמתנה שהמשתמש ימלא את `.env`.
6. Vitest + Playwright והבדיקות; תיקון עד שהכול עובר.
7. `supabase/migrations/.gitkeep`.
8. עדכון `CLAUDE.md` → „פקודות הרצה”: dev `npm run dev`; בדיקות `npm test` ו-`npm run test:e2e`.
9. ADR-4 (חיבור Vercel בלי Production Deployment) ב-ARCHITECTURE.md.
10. הרצה ובדיקה עצמית: `lint`, `typecheck`, `build`, `test`, `test:e2e`, צילומי מסך; סגירת השרת.
11. סימון 🟡 ליד Milestone 1 ב-MILESTONES.md. **בלי commit.**
12. (שלב הדחיפה, רק בבקשת המשתמש) push → הדרכת Vercel (7.2) → Preview → סימון ✅.

## 10. Definition of Done — איך כל סעיף נבדק

| סעיף | איך נבדק | מתי |
|---|---|---|
| `build` עובר בלי שגיאות | `npm run build` (+ `lint`, `typecheck`) | בנייה |
| דף זמני בעברית, RTL, גופנים וצבעים נכונים | בדיקת Playwright + צילומי מסך במחשב ובמובייל | בנייה |
| `budgi-dev` קיים והאפליקציה מתחברת | בדיקת Vitest + שורת הסטטוס בדף „תקין” | בנייה (אחרי שהמשתמש מילא `.env`) |
| `.env.example` בלי ערכים; `.env` מוחרג | בדיקת התוכן של `.env.example`; `git check-ignore .env` | בנייה |
| Vitest ו-Playwright עוברים | `npm test`, `npm run test:e2e` | בנייה |
| Preview ב-Vercel עובד ומחובר ל-`budgi-dev` | כתובת ה-Preview מציגה „תקין” | דחיפה |
| Production Branch = `production`, אין Production Deployment | מסך Settings ו-Deployments ב-Vercel | דחיפה |
| המשתמש קיבל הסבר היכן נשמרים פרטי הגישה | סעיף 7.3 נמסר בסיכום | בנייה + דחיפה |

שני סעיפי ה-Vercel תלויים ב-push, ולכן יושלמו בשלב הדחיפה (באישור המשתמש). בסיכום הבנייה הם יסומנו „ממתין לדחיפה”.

## 11. מחוץ לתחום של אבן הדרך

התחברות Google, Shell וניווט, טבלאות ו-Migrations, משתמשי בדיקה (`E2E_*`), Supabase client מלא (`@supabase/ssr`), Recharts, React Hook Form/Zod, פורמט מטבע ותאריכים — כולם מ-M2 ואילך.
