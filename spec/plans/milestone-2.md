# תוכנית — Milestone 2: התחברות, Shell והגדרה ראשונית

> מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` (3.2, 3.3, 4.1, 4.2, 4.8, 4.9, 5.6), `ARCHITECTURE.md` (2.2, 2.3, 3.1–3.4, 6.1, 6.2, 7.2, 7.5, 7.6, 8.1, ADR-3), `DESIGN.md` (1.1, 1.2, 1.3 מצב ריק, 1.10 אזורים 1/2/4/5, 1.13, 1.14, 1.15, 2.1–2.5).
> מחוץ לאבן הדרך: קמפיינים ותקציבי קמפיינים (M3), מסך תקציב ומדדים (M5), התראות ופעמון פעיל (M7), מחיקת חשבון (M9).

## 1. מטרה ותוצר

בסוף אבן הדרך:
- משתמש נכנס עם Google (מסך אחד, בלי הרשמה נפרדת). משתמש חדש עובר להגדרה ראשונית, שומר תקציב חודשי ויעד הכנסות, ומגיע למסך הבית.
- מסך הבית מציג בשלב זה רק את המצב הריק של DESIGN 1.14 („עוד אין נתונים לתקופה הזו”).
- ה-Shell עובד: סרגל צד מימין במחשב, מגירה במובייל, כותרת עליונה עם פעמון ושם המשתמש. מסכים שעוד לא נבנו מציגים דף „בקרוב”.
- מסך הגדרות חלקי: פרטי חשבון, יעדים לפי חודש, קישורים משפטיים והתנתקות.
- דפי תנאי שימוש ופרטיות עם „התוכן יעודכן בקרוב.”, פתוחים גם בלי התחברות.
- טבלאות `profiles`, `budgets`, `business_goals` עם RLS ב-`budgi-dev`, והעתקה אוטומטית של תקציב ויעדים לחודש חדש.
- שני משתמשי בדיקה (Email/Password, ב-`budgi-dev` בלבד), בדיקות RLS ב-Vitest, ו-Playwright שמתחבר כמשתמש בדיקה ומשלים הגדרה ראשונית.
- הדף הזמני של Milestone 1 מוסר.

## 2. החלטות טכניות לאבן הדרך

| נושא | החלטה | הסבר קצר |
|---|---|---|
| ספריות חדשות | `@supabase/supabase-js`, `@supabase/ssr`, `react-hook-form`, `zod`, `@hookform/resolvers`. רכיבי shadcn: `sheet` (מגירה), `select`, `sonner` (Toast), `skeleton` | לפי ARCHITECTURE 1.1 ו-6.1 (SSR client עם Cookies) |
| Next.js 16 | `cacheComponents` פעיל: כל קריאה של Session/Cookies יושבת בתוך `<Suspense>`. במקום `middleware.ts` משתמשים ב-`src/proxy.ts` (השם החדש ב-Next 16). לפני הכתיבה — לקרוא את `node_modules/next/dist/docs` הרלוונטיים (`proxy.md`, `authentication.md`, `authentication-with-cache-components.md`, `forms.md`, `server-actions.md`) | ההנחיה ב-`AGENTS.md` |
| Proxy | `src/proxy.ts` מרענן את ה-Session של Supabase בכל בקשה, מפנה משתמש לא מחובר מנתיבים מוגנים ל-`/login`, ומשתמש מחובר מ-`/login` ומ-`/` ל-`/dashboard`. נתיבים ציבוריים: `/login`, `/terms`, `/privacy`, `/auth/callback`, קבצים סטטיים | התבנית הרשמית של Supabase ל-Next.js |
| שכבת גישה (DAL) | `src/server/auth/session.ts` עם `getCurrentUser()` (קורא `supabase.auth.getUser()` + `profiles`) ו-`requireOnboardedUser()` שמפנה ל-`/login` או ל-`/onboarding`. כל Server Action מאמת משתמש מחדש | ARCHITECTURE 6.1: לא מסתמכים על הסתרה ב-Frontend |
| התחברות Google | כפתור בצד הלקוח קורא `signInWithOAuth({ provider: 'google', redirectTo: origin + '/auth/callback' })`. `src/app/auth/callback/route.ts` מבצע `exchangeCodeForSession` ומפנה ל-`/onboarding` או ל-`/dashboard`; בכישלון — `/login?error=1` | `origin` מהדפדפן, כך שזה עובד גם מקומית וגם ב-Preview בלי משתנה חדש |
| יצירת פרופיל | Trigger על `auth.users` (AFTER INSERT, `security definer`) יוצר שורת `profiles` עם `display_name` ו-`email` מנתוני Google | אין צורך במסך הרשמה |
| הגדרה ראשונית | פונקציית SQL `complete_onboarding(p_month, p_budget, p_revenue_goal)` (security invoker) שומרת תקציב, יעד הכנסות ו-`onboarding_completed_at` בטרנזקציה אחת | שלא יישאר מצב חלקי |
| העתקה לחודש חדש | פונקציית SQL `ensure_month_defaults(p_month)` (security invoker, לפי `auth.uid()`): אם אין לחודש `budgets` — מעתיקה מהחודש האחרון **שלפניו** שיש בו תקציב; אם אין לחודש אף שורת `business_goals` — מעתיקה את כל שורות היעדים מהחודש האחרון שלפניו שיש בו יעדים. `ON CONFLICT DO NOTHING`. נקראת מהשרת לפני כל קריאה של תקציב/יעדים לחודש | ARCHITECTURE 3.2 „אין צורך ב-Cron”. העתקת תקציבי קמפיינים תתווסף לאותה פונקציה ב-M3 |
| „אין יעד” בחודש | `business_goals.target_value` מאפשר `NULL`: שדה יעד שרוקן נשמר כשורה עם `NULL` = „אין יעד בחודש הזה” | אחרת חודש שבו המשתמש מחק את כל היעדים ייראה „ריק” ויקבל העתקה מחדש. יתועד כ-ADR-6 |
| הרצת Migrations | קובץ SQL ב-`supabase/migrations/`, מוחל על `budgi-dev` דרך כלי ה-Supabase MCP (`apply_migration`), לאחר שווידאתי ששם הפרויקט הוא `budgi-dev`. שם הקובץ מיושר לגרסה שנרשמה ב-`list_migrations` | לא דורש מהמשתמש להריץ CLI או לתת סיסמת DB. יתועד ב-ADR-6. ב-M9 ה-CLI ידחוף את אותם קבצים ל-`budgi-prod` |
| ולידציה | סכמות Zod משותפות לקליינט ולשרת ב-`src/lib/validation/`, הודעות בעברית | ARCHITECTURE 1.1 |
| חודש נוכחי | מחושב לפי `Asia/Jerusalem` ב-`src/lib/dates/` | PRD 5.6 |
| בדיקות E2E | `tests/e2e/auth.setup.ts` מתחבר בקוד (`signInWithPassword`) דרך `createServerClient` של `@supabase/ssr`, אוסף את ה-Cookies שהספרייה מייצרת, ושומר `storageState`. מסך ההתחברות אינו מציג Email/Password | ARCHITECTURE 8.1, ADR-3 |

## 3. Database — Migration אחד: `supabase/migrations/<version>_auth_profiles_budgets_goals.sql`

### `profiles`
- `id uuid primary key references auth.users(id) on delete cascade`, `display_name text`, `email text`, `onboarding_completed_at timestamptz`, `created_at timestamptz not null default now()`.
- RLS: `select` ו-`update` רק כש-`id = auth.uid()`. אין `insert`/`delete` למשתמש (ה-Trigger יוצר; מחיקה ב-Cascade).
- Grants: `revoke all` מ-`anon`; ל-`authenticated`: `select`, ו-`update (onboarding_completed_at)` בלבד (משמש גם לאיפוס בבדיקות E2E). שם ואימייל לקריאה בלבד.
- Trigger `on_auth_user_created` → `handle_new_user()` (`security definer`, `set search_path = ''`): `display_name` מ-`raw_user_meta_data->>'full_name'` (או `name`), `email` מ-`new.email`.

### `budgets`
- `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `month date not null`, `planned_amount numeric(12,2) not null`, `created_at`, `updated_at`.
- `unique (user_id, month)`, `check (extract(day from month) = 1)`, `check (planned_amount >= 0)`, אינדקס על `(user_id, month)`.

### `business_goals`
- `id`, `user_id` (כמו למעלה), `month date not null`, `goal_type text not null check (goal_type in ('revenue','deals','leads','min_roas'))`, `target_value numeric(12,2)` (nullable — ראו ADR-6), `updated_at`.
- `unique (user_id, month, goal_type)`, `check (extract(day from month) = 1)`, `check (target_value is null or target_value >= 0)`, ו-`check` ש-`deals`/`leads` הם מספר שלם. אינדקס על `(user_id, month)`.

### משותף
- RLS מופעל על שלוש הטבלאות. ב-`budgets` ו-`business_goals`: `select`/`insert`/`update`/`delete` עם `user_id = (select auth.uid())`; `insert` עם `WITH CHECK`, `update` עם `USING` + `WITH CHECK`.
- Grants: `revoke all ... from anon`; ל-`authenticated` רק הפעולות הנדרשות.
- Trigger `set_updated_at` לעדכון `updated_at`.
- הפונקציות `complete_onboarding` ו-`ensure_month_defaults` — `security invoker`, `set search_path = ''`, `grant execute` ל-`authenticated` בלבד.
- אחרי ההחלה: הרצת `get_advisors` (security) של Supabase ותיקון ממצאים.

## 4. מבנה קבצים (ליצירה / שינוי)

```text
src/
  proxy.ts                               # session refresh + auth redirects
  app/
    page.tsx                             # REPLACED: redirect only (proxy handles it; fallback redirect)
    (auth)/login/page.tsx                # DESIGN 1.1
    (auth)/login/google-button.tsx       # client: signInWithOAuth
    auth/callback/route.ts               # code exchange → /onboarding or /dashboard
    (legal)/layout.tsx                   # small logo, reading width, back link
    (legal)/terms/page.tsx               # "התוכן יעודכן בקרוב."
    (legal)/privacy/page.tsx
    (app)/layout.tsx                     # Shell (sidebar, header, drawer) + Suspense
    (onboarding)/onboarding/page.tsx     # DESIGN 1.2, no Shell (see note below)
    (app)/dashboard/page.tsx             # "סקירה כללית" + empty state (1.14)
    (app)/settings/page.tsx              # account, goals, legal, logout
    (app)/campaigns|budget|metrics|forecast|advisor|alerts|imports/page.tsx  # ComingSoon
  components/
    shell/sidebar-nav.tsx                # nav items (1.15), active state
    shell/app-header.tsx                 # bell (no count yet), user name + icon, ☰ on mobile
    shell/mobile-drawer.tsx              # shadcn Sheet, side=right
    shell/coming-soon.tsx
    common/empty-state.tsx               # icon, title, text, CTA (1.14)
    forms/amount-input.tsx               # ₪ inside field, inputMode=decimal
    ui/ (sheet, select, sonner, skeleton) # shadcn additions
  features/
    auth/actions.ts                      # signOut server action
    onboarding/onboarding-form.tsx       # RHF + Zod
    onboarding/actions.ts                # completeOnboarding
    goals/goals-form.tsx                 # month picker + 4 fields
    goals/actions.ts                     # saveGoals
  lib/
    supabase/server.ts                   # createServerClient (cookies)
    supabase/client.ts                   # createBrowserClient
    supabase/proxy.ts                    # updateSession helper for proxy.ts
    supabase/database.types.ts           # generated (generate_typescript_types)
    validation/amounts.ts                # money, integer, roas schemas (Hebrew errors)
    validation/onboarding.ts, goals.ts
    dates/month.ts                       # currentMonth (Asia/Jerusalem), Hebrew month label, month list
    currency/format.ts                   # ₪12,500 formatting, parsing "12,500"
  server/
    auth/session.ts                      # getCurrentUser, requireOnboardedUser (DAL)
    repositories/budgets.ts, goals.ts, profiles.ts
    services/month-defaults.ts           # calls ensure_month_defaults RPC
supabase/migrations/<version>_auth_profiles_budgets_goals.sql
tests/
  unit/validation.test.ts, dates.test.ts, currency.test.ts
  rls/rls.test.ts                        # user A vs user B
  integration/onboarding-and-copy.test.ts
  support/test-users.ts                  # sign in A/B with supabase-js, reset helpers
  e2e/auth.setup.ts                      # storageState for user A
  e2e/onboarding.spec.ts, shell.spec.ts, settings.spec.ts, public-pages.spec.ts
  e2e/home.spec.ts                       # REMOVED (temporary page is gone)
```

הערה: מסך ההגדרה הראשונית **בלי ה-Shell** (DESIGN 1.15). לכן הוא יושב ב-route group נפרד — `src/app/(onboarding)/onboarding/page.tsx` — ולא תחת `(app)`. ה-Layout של `(app)` מפנה ל-`/onboarding` אם ההגדרה לא הושלמה, ודף ה-onboarding מפנה ל-`/dashboard` אם כבר הושלמה.

קבצים שמשתנים: `package.json` (תלויות, `test` כולל `tests/rls`), `vitest.config.ts` (include ל-`tests/rls/**`), `playwright.config.ts` (project `setup` + `storageState`, ‏`dependencies`), `.env.example` (משתני `E2E_*`), `src/app/layout.tsx` (Toaster), `CLAUDE.md` (אם פקודות ההרצה משתנות — לא צפוי), `ARCHITECTURE.md` (ADR-6 בלבד).
`src/lib/supabase/health.ts` ובדיקת החיבור שלו נשארים.

## 5. מסכים — פירוט מימוש

### 5.1 התחברות `/login` (DESIGN 1.1)
- מרוכז, בלי Shell, רקע עם אלמנט גלים/Nodes עדין (SVG/CSS פשוט ב-Purple Gradient בשקיפות נמוכה — לא איור כבד).
- לוגו (כמו שהוא), כפתור ראשי „התחברות עם Google” עם סמל Google (SVG רשמי, `aria-hidden`; הטקסט נותן את המשמעות).
- מתחת: „אין לך חשבון? הוא ייווצר אוטומטית בהתחברות הראשונה.”
- `?error=1` → הודעת שגיאה קצרה מעל הכפתור: „ההתחברות לא הושלמה. נסה שוב.” (`role="alert"`). ביטול במסך Google חוזר גם הוא עם שגיאה.
- בתחתית: קישורים „תנאי שימוש” ו„מדיניות פרטיות”.

### 5.2 הגדרה ראשונית `/onboarding` (DESIGN 1.2)
- ברוחב עד 560px, לוגו, H2 „ברוכים הבאים ל-Budgi”, שורת ההסבר מה-DESIGN.
- כרטיס: „תקציב שיווק חודשי *” ו„יעד הכנסות חודשי *” (שדות ₪), טקסט העזר מתחת ליעד, שורת העזר על יעדים נוספים, כפתור ברוחב מלא „התחל לעבוד עם Budgi”.
- שמירה → `complete_onboarding` לחודש הנוכחי → `/dashboard`. שגיאת שרת → Toast אדום.

### 5.3 Shell (DESIGN 1.15, 2.3)
- סרגל צד 240px מימין (768px ומעלה): לוגו, ופריטים לפי הסדר — בית, קמפיינים, תקציב, מדדים, תחזית, AI Advisor, התראות, ייבוא נתונים, הגדרות — עם אייקוני Lucide. פריט פעיל: רקע סגול בהיר, טקסט ואייקון Purple, `aria-current="page"`.
- כותרת עליונה: פעמון (קישור ל-`/alerts`, `aria-label="התראות"`; המונה יופיע ב-M7) ושם המשתמש עם אייקון.
- מובייל (<768px): ☰ מימין, לוגו במרכז, פעמון משמאל. ☰ פותח מגירה מימין עם רקע כהה שקוף; לחיצה על פריט או מחוץ לה סוגרת. מקלדת: Esc סוגר, Focus נשאר במגירה.
- אזור תוכן עד 1280px, ריווח 16px במובייל.
- שם המשתמש נטען בתוך `<Suspense>` עם Skeleton קטן.

### 5.4 בית `/dashboard`
- כותרת „סקירה כללית” ומצב ריק: „עוד אין נתונים לתקופה הזו”, כפתורים „הוספת קמפיין” ו„ייבוא נתונים” (מובילים כרגע לדפי „בקרוב”). בורר התקופה, הכרטיסים והגרף — ב-M5.

### 5.5 „בקרוב”
- רכיב אחד: כותרת המסך (למשל „קמפיינים”), אייקון, „המסך הזה ייבנה בקרוב.” כל פריט ניווט שלא נבנה מוביל לנתיב שלו עם הרכיב הזה, כך שהסימון בניווט נכון.

### 5.6 הגדרות `/settings` (DESIGN 1.10, אזורים 1, 2, 4, 5)
1. **פרטי חשבון:** שם ואימייל (לקריאה בלבד).
2. **יעדים:** בורר חודש (Select; מהחודש הראשון שבו הוגדרו יעדים ועד החודש הבא, ברירת מחדל: הנוכחי). שדות: יעד הכנסות (₪), מספר עסקאות, מספר לידים, ROAS מינימלי. שדה ריק = אין יעד. לפני הצגת חודש — `ensure_month_defaults`. כפתור „שמירת יעדים” → upsert של ארבע השורות לחודש (ריק → `NULL`) → Toast „היעדים נשמרו”.
3. **מידע משפטי:** קישורים לשני הדפים.
4. **יציאה:** כפתור משני „התנתקות” → `signOut` → `/login`.
- אזורי „התראות” (M7) ו„אזור מסוכן” (M9) — לא מוצגים עדיין.

### 5.7 תנאי שימוש ופרטיות `/terms`, `/privacy` (DESIGN 1.13)
- לוגו קטן, H1 („תנאי שימוש” / „מדיניות פרטיות”), „התוכן יעודכן בקרוב.”, וקישור חזרה. נגישים בלי התחברות.

## 6. ולידציה (PRD 4.8)
- סכום (תקציב, יעד הכנסות): מספר ≥ 0, עד שתי ספרות אחרי הנקודה, עד 9,999,999,999.99; מקבל „12,500”. בהגדרה הראשונית שני השדות חובה.
- עסקאות, לידים: מספר שלם ≥ 0.
- ROAS מינימלי: מספר ≥ 0, עד שתי ספרות אחרי הנקודה.
- הודעות לדוגמה: „יש להזין סכום”, „יש להזין מספר שאינו שלילי”, „יש להזין מספר שלם”. מוצגות מתחת לשדה, גבול אדום, `aria-invalid` ו-`aria-describedby`.
- אותה סכמה רצה שוב בשרת (Server Action) לפני השמירה.

## 7. מה המשתמש יעשה בעצמו (בהדרכה צעד אחר צעד, בשפה פשוטה)

אני אעצור בתחילת הבנייה ואדריך את המשתמש. אין להדביק Secrets בצ'אט.
1. **Google Cloud Console:** יצירת פרויקט, מסך הסכמה (Consent Screen) מסוג External במצב Testing והוספת כתובת ה-Gmail שלו כמשתמש בדיקה, ויצירת OAuth Client מסוג Web עם Redirect URI של `budgi-dev` (`https://<ref>.supabase.co/auth/v1/callback` — אמסור את הכתובת המדויקת).
2. **Supabase (`budgi-dev`) → Authentication:** הפעלת ספק Google והדבקת Client ID ו-Client Secret ישירות בדשבורד; Site URL = `http://localhost:3000`; Redirect URLs: `http://localhost:3000/**` ותבנית כתובות ה-Preview של Vercel (`https://*-<team>.vercel.app/**` — אמסור את הנוסח המדויק).
3. **Email/Password (ב-`budgi-dev` בלבד):** וידוא שהספק פעיל, ויצירת שני משתמשים ב-Authentication → Users → Add user (עם Auto Confirm). כתובות לדוגמה: `e2e-a@budgi.test`, `e2e-b@budgi.test`. המשתמש בוחר סיסמאות וממלא אותן ב-`.env` (`E2E_USER_A_EMAIL`, `E2E_USER_A_PASSWORD`, `E2E_USER_B_EMAIL`, `E2E_USER_B_PASSWORD`).
4. אחרי הבנייה — בדיקה ידנית של התחברות Google מקומית.

אם כלי ה-MCP של Supabase לא יוכל לגשת ל-`budgi-dev` — אעצור ואדריך הרצה של פקודה אחת (בלי העתקה ידנית של ערכים).

## 8. בדיקות

### Vitest
- **Unit:** סכמות הוולידציה (שלילי, לא שלם, פסיקים, ריק), חודש נוכחי לפי `Asia/Jerusalem` (כולל מעבר חודש בחצות ישראל ב-UTC), עיצוב ₪.
- **RLS (`tests/rls/rls.test.ts`, מול `budgi-dev`):** A ו-B מתחברים בסיסמה. A יוצר תקציב ויעד; B לא רואה אותם, לא יכול לעדכן או למחוק אותם (0 שורות מושפעות), ולא יכול להכניס שורה עם `user_id` של A. B לא רואה את הפרופיל של A ולא יכול לעדכן אותו. `anon` לא קורא כלום. ניקוי נתונים בסוף.
- **Integration:** `complete_onboarding` שומר תקציב + יעד + מסמן סיום; `ensure_month_defaults` מעתיק תקציב ויעדים (כולל יעד `NULL`) מחודש קודם לחודש חדש, לא דורס חודש שכבר מוגדר, ולא ממציא נתונים כשאין חודש קודם.

### Playwright (desktop + mobile)
- `auth.setup.ts`: התחברות כמשתמש A, איפוס הנתונים שלו (מחיקת תקציבים/יעדים, `onboarding_completed_at = null`), שמירת `storageState`.
- `onboarding.spec.ts`: משתמש A מופנה ל-`/onboarding`; שגיאות ולידציה בעברית (ריק, שלילי); שמירה → `/dashboard` עם המצב הריק; כניסה ל-`/onboarding` שוב → מופנה לבית.
- `shell.spec.ts`: ניווט בין הפריטים במחשב; במובייל — ☰ פותח מגירה, לחיצה על פריט מנווטת וסוגרת; דף „בקרוב”.
- `settings.spec.ts`: פרטי חשבון מוצגים; שמירת יעדים נוספים ונשמרים אחרי רענון; ולידציה; התנתקות → `/login`, וניסיון גישה ל-`/settings` מפנה ל-`/login`.
- `public-pages.spec.ts` (בלי Session): `/login` מציג את הכפתור והקישורים; `/terms` ו-`/privacy` נפתחים; `/dashboard` מפנה ל-`/login`; `/login?error=1` מציג שגיאה.
- הבדיקות של A רצות ברצף (`fullyParallel: false` לקבצים האלה), כי הן משנות את אותו משתמש.

### בדיקה עצמית לפני סימון 🟡
`npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:e2e`; בדיקה בעין ב-Browser pane (מחשב + מובייל, RTL, Focus); `get_advisors` של Supabase. התחברות Google — ידנית על ידי המשתמש.

## 9. מיפוי ל-Definition of Done

| DoD | איך מוכיחים |
|---|---|
| התחברות Google עובדת ב-Development | בדיקה ידנית של המשתמש אחרי שלב 7 |
| משתמש חדש → הגדרה ראשונית → בית | `onboarding.spec.ts` + בדיקה ידנית עם Google |
| נשמרים תקציב ויעד הכנסות | `onboarding.spec.ts` + Integration |
| הוספת יעדים נוספים בהגדרות | `settings.spec.ts` |
| העתקה לחודש חדש | Integration של `ensure_month_defaults` |
| ניווט במחשב ובמובייל | `shell.spec.ts` (שני ה-projects) |
| יציאה וכניסה מחדש — הנתונים נשמרו | `settings.spec.ts` (התנתקות, התחברות מחדש דרך setup, היעדים עדיין שם) |
| RLS בין A ל-B | `tests/rls/rls.test.ts` |
| ולידציה והודעות בעברית | Unit + E2E |
| Playwright מתחבר ומשלים הגדרה ראשונית | `auth.setup.ts` + `onboarding.spec.ts` |
| Migrations הורצו ונבדקו ב-`budgi-dev` | `list_migrations`, `list_tables`, `get_advisors` + בדיקות RLS/Integration |

## 10. תיעוד
- **ADR-6** ב-ARCHITECTURE.md: „יעד ריק נשמר כ-`NULL`, והחלת Migrations על `budgi-dev` דרך Supabase MCP” (הקשר, החלטה, השלכות).
- `.env.example`: הוספת ארבעת משתני `E2E_*` (בלי ערכים), ותזכורת למשתמש להוסיף אותם ל-`.env`.
- סימון 🟡 ליד Milestone 2 ב-MILESTONES.md בסיום הבנייה.
