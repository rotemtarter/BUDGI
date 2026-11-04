# ARCHITECTURE.md --- Budgi

## ארכיטקטורה טכנית ו-Technology Stack

> **סטטוס:** הצעת ארכיטקטורה ל-MVP\
> **תאריך בדיקת מקורות:** 30 באוקטובר 2026\
> **עיקרון מנחה:** ארכיטקטורת Monolith מודולרית, עם מינימום שירותים
> מנוהלים, ללא Microservices וללא תשתיות שאינן נדרשות ל-MVP.

------------------------------------------------------------------------

## 1. Technology Stack שנבחר

### 1.1 סיכום הטכנולוגיות

  -----------------------------------------------------------------------
  שכבה / רכיב             טכנולוגיה נבחרת         תפקיד
  ----------------------- ----------------------- -----------------------
  Frontend ו-Web          **Next.js (App          ממשק Web רספונסיבי,
  framework               Router) + React**       ניווט, Server
                                                  Components ו-Client
                                                  Components לפי הצורך

  שפת פיתוח               **TypeScript**          טיפוסים משותפים, בטיחות
                                                  בפיתוח ותחזוקה

  UI ו-CSS                **Tailwind CSS**        עיצוב רכיבי הממשק
                                                  ו-Responsive layout

  רכיבי UI                **shadcn/ui**           רכיבי בסיס נגישים
                                                  וניתנים להתאמה

  גרפים                   **Recharts**            גרפי מגמה והשוואת מדדים
                                                  ב-Dashboard

  טפסים וולידציה          **React Hook Form +     טפסי הגדרות, קמפיינים
                          Zod**                   ונתונים עם ולידציה בצד
                                                  הלקוח והשרת

  Backend                 **Next.js Route         API פנימי, פעולות שרת,
                          Handlers / Server       חישובים, ייבוא וקריאות
                          Actions**               AI

  Database                **Supabase PostgreSQL** נתונים רלציוניים,
                                                  היסטוריית ביצועים,
                                                  תקציבים, יעדים והתראות

  Authentication          **Supabase Auth עם      הרשמה והתחברות באמצעות
                          Google OAuth**          Google וניהול Sessions

  Authorization           **PostgreSQL Row Level  הפרדה בין נתוני משתמשים
                          Security (RLS)**        והגנה ברמת מסד הנתונים

  Database migrations     **Supabase CLI + SQL    ניהול מבוקר ומתועד של
                          migrations**            שינויים בסכמת הנתונים

  ייבוא Excel / CSV       **SheetJS (`xlsx`) +    קריאת קבצים, מיפוי
                          parser ל-CSV**          עמודות וולידציה בצד
                                                  השרת

  AI                      **OpenAI API (Responses ניתוח נתונים, שיחה
                          API)**                  והפקת המלצות מובנות

  ולידציה של תשובות AI    **Zod + Structured      הבטחת מבנה צפוי לתשובות
                          Outputs**               ולהמלצות

  Hosting ו-Deployment    **Vercel**              Hosting ל-Next.js,
                                                  Functions ופריסה
                                                  אוטומטית מ-GitHub

  ניהול קוד               **GitHub**              Git Repository,
                                                  branches, Pull Requests
                                                  והיסטוריית שינויים

  בדיקות                  **Vitest + Playwright** Unit/Integration tests
                                                  ובדיקות End-to-End

  ניטור בסיסי             **Vercel Logs +         איתור שגיאות, זמני
                          Supabase Logs**         תגובה ובעיות תפעול
  -----------------------------------------------------------------------

### 1.2 החלטות טכנולוגיות מרכזיות

#### Next.js במקום React SPA נפרד

נבחר Next.js עם App Router כדי להחזיק Frontend ו-Backend באותו
Repository ובאותה אפליקציה. Route Handlers מאפשרים API פנימי, ו-Server
Components מאפשרים לבצע פעולות שרת בלי לחשוף סודות לדפדפן. כך נמנעת
תחזוקה של שני פרויקטים או Backend נפרד. Next.js מתועד היטב ומתאים
ל-Deployment ב-Vercel.\
מקורות: [Next.js App Router](https://nextjs.org/docs/app), [Next.js
Route
Handlers](https://nextjs.org/docs/app/getting-started/route-handlers).

#### Supabase PostgreSQL במקום NoSQL

הנתונים של Budgi הם רלציוניים מטבעם: משתמשים, קמפיינים, תקופות, נתוני
ביצועים, תקציבים, יעדים והתראות. PostgreSQL מאפשר קשרים, אילוצים,
Aggregations וטרנזקציות, ולכן מתאים יותר מ-NoSQL. Supabase מספק
PostgreSQL מנוהל, Auth ו-RLS באותו שירות, ומפחית את כמות התשתיות שיש
לתחזק.

#### Supabase Auth במקום ספק Authentication נוסף

Supabase Auth תומך ב-Google OAuth ומשתלב עם JWT ו-RLS. אין צורך להוסיף
ספק Authentication חיצוני. הגדרת Google OAuth תיעשה ב-Supabase וב-Google
Cloud Console.\
מקורות: [Supabase Auth](https://supabase.com/docs/guides/auth), [Sign in
with
Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

#### Vercel ל-Hosting

Vercel מריץ Next.js באופן טבעי ומתחבר ישירות ל-GitHub. Push ל-branch
יוצר Preview Deployment, ומיזוג ל-branch הראשי יוצר Production
Deployment. אין צורך לנהל שרת, מערכת הפעלה או תהליך פריסה עצמאי.\
מקור: [Vercel --- Deploying Git
Repositories](https://vercel.com/docs/git).

#### OpenAI API עבור AI Budget Advisor

ה-AI נדרש להבנת שאלות בשפה חופשית ולניסוח הסברים והמלצות. אין צורך לאמן
מודל עצמאי או להקים Vector Database: נתוני החשבון הרלוונטיים יישלפו
מ-PostgreSQL, יעברו חישוב דטרמיניסטי, ורק סיכום הנתונים הדרוש יישלח
למודל. Structured Outputs יאפשרו לקבל תשובה במבנה JSON מוגדר ולוודא אותה
באמצעות Zod.\
מקור: [OpenAI Structured
Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

#### ספריות UI ונתונים

Tailwind CSS ו-shadcn/ui מאפשרים לבנות ממשק מותאם ללא Design System כבד.
Recharts מספקת גרפים מתאימים ל-Dashboard. React Hook Form ו-Zod מספקים
ולידציה משותפת לטפסים. SheetJS משמשת לקריאת Excel; עיבוד הקבצים יתבצע
בשרת ולא בדפדפן כדי לשלוט בוולידציה ובגבולות הקלט.

### 1.3 חלופות שנבחנו בקצרה

  -----------------------------------------------------------------------
  תחום                    חלופות רלוונטיות        בחירה והנמקה
  ----------------------- ----------------------- -----------------------
  Web framework           Next.js, React + Vite,  Next.js נבחר כי נדרש גם
                          Remix                   Backend, והאינטגרציה עם
                                                  Vercel מפחיתה תפעול

  Database / Backend      Supabase, Firebase,     Supabase נבחר בזכות
  platform                Neon + Auth נפרד        PostgreSQL, Auth ו-RLS
                                                  במוצר אחד; Firebase
                                                  פחות טבעי למודל
                                                  הרלציוני

  Hosting                 Vercel, Render, Railway Vercel נבחר בזכות התאמה
                                                  ישירה ל-Next.js
                                                  ו-GitHub CI/CD

  Authentication          Supabase Auth, Auth.js, Supabase Auth נבחר כדי
                          Clerk                   לצמצם ספקים ולשלב
                                                  הרשאות RLS

  Charts                  Recharts, Chart.js,     Recharts מספיקה לגרפים
                          ECharts                 הנדרשים ואינטגרטיבית
                                                  ל-React

  AI                      OpenAI API, Anthropic   OpenAI נבחר כברירת מחדל
                          API, Gemini API         בשל Structured Outputs
                                                  ותיעוד API; שכבת השירות
                                                  תישאר מבודדת מספק יחיד
                                                  ככל האפשר
  -----------------------------------------------------------------------

ההשוואה היא לצורך בחירת פתרון MVP, ולא טענה שהחלופות האחרות אינן
מתאימות.

### 1.4 עלויות, תוכניות ומגבלות

המחירים משתנים לפי שימוש, אזור, מסים ותנאי ספק. יש לאמת אותם לפני פתיחת
חשבונות וחיוב בפועל.

  -----------------------------------------------------------------------
  שירות                   עלות / תוכנית רלוונטית  משמעות ל-Budgi
  ----------------------- ----------------------- -----------------------
  Vercel Hobby            \$0, מיועד לפרויקטים    מתאים ל-Prototyping
                          אישיים ולא בהכרח לשימוש אישי בלבד; למוצר מסחרי
                          מסחרי                   יש לתכנן Vercel Pro

  Vercel Pro              מחיר בסיס שפורסם: \$20  ברירת המחדל
                          לחודש, לפני תוספות      ל-Production מסחרי;
                          ושימוש מעבר למכסה       כולל קרדיט שימוש לפי
                                                  תנאי התוכנית

  Supabase Free           \$0; עד שני פרויקטים    מתאים לפיתוח ולהדגמה,
                          פעילים בחשבון Free, אך  אך לא מומלץ להסתמך עליו
                          פרויקטים בעלי פעילות    ל-Production עסקי
                          נמוכה עשויים להיעצר     

  Supabase Pro            החל מ-\$25 לחודש לפי    מתאים ל-Production; יש
                          המחירון שפורסם; פרויקט  לתקצב בנפרד פרויקט
                          נוסף עשוי להוסיף עלות   Development ופרויקט
                          Compute                 Production

  OpenAI API              תשלום לפי מודל, Tokens  עלות משתנה לפי מספר
                          ושימוש בפועל            שיחות, אורך הקשר והמודל
                                                  שנבחר; יש להגדיר Budget
                                                  limits וניטור

  GitHub                  ניתן להתחיל בתוכנית     מספיק ל-Repository
                          Free                    פרטי, branches ו-Pull
                                                  Requests ב-MVP
  -----------------------------------------------------------------------

**החלטת סביבות:** - בתחילת הפיתוח מקימים רק את פרויקט `budgi-dev`
בתוכנית Free. את `budgi-prod` מקימים רק באבן הדרך האחרונה (ראו 7.1). יש
להביא בחשבון שפרויקט Free עם פעילות נמוכה במשך כשבוע עלול להיעצר
אוטומטית. השהיה אינה מחיקת נתונים, אך האפליקציה לא תוכל להשתמש בפרויקט
עד חידושו. - לפני השקת מוצר Production אמיתי, יש להעביר את סביבת Production
לתוכנית בתשלום כדי למנוע השהיה אוטומטית וליהנות מגיבויים ותמיכה מתאימים
יותר. יש לבדוק האם שתי הסביבות באותה Organization ובאותה תוכנית או
בארגונים נפרדים; ב-Supabase תוכנית החיוב חלה ברמת Organization, ולא ניתן
לשלב תוכניות שונות באותה Organization. - אם גם Development חייבת להיות
זמינה באופן רציף, יש לתקצב עבורה Compute בתוכנית בתשלום. אפשר להשאיר
Development ב-Free רק אם מקבלים את מגבלת ההשהיה ומפעילים אותה מחדש בעת
הצורך.

מקורות: [Supabase Pricing](https://supabase.com/pricing), [Supabase
Billing](https://supabase.com/docs/guides/platform/billing-on-supabase),
[Supabase Free Project
Pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[Vercel Pricing](https://vercel.com/pricing), [Vercel
Limits](https://vercel.com/docs/limits).

### 1.5 סיכונים ומגבלות משמעותיים

-   **דיוק נתוני מקור:** הנתונים מוזנים ידנית או מיובאים, ולכן איכות
    התחזית וההמלצות תלויה באיכותם ובאחידותם.
-   **שיוך הכנסות לפרסום:** ROAS תלוי בכך שהמשתמש מזין הכנסות המיוחסות
    לקמפיין באופן עקבי. Budgi אינה מאמתת שיוך זה מול פלטפורמות פרסום
    ב-MVP.
-   **המלצות AI:** מודל שפה עלול לטעות. לכן חישובים מספריים יבוצעו בקוד
    ולא על ידי המודל, והמודל יקבל רק תוצאות מחושבות ונתונים רלוונטיים.
-   **עלות AI:** שימוש לא מבוקר עלול להגדיל עלויות. יש להגביל אורך שיחה,
    כמות נתונים שנשלחת ומספר בקשות.
-   **Vercel Functions:** עיבוד קובצי Excel גדולים או בקשות AI ארוכות
    עלולים להתקרב למגבלות זמן/זיכרון של Functions. יש להגדיר גודל קובץ
    מרבי, ולדחות קבצים חריגים עם הודעה ברורה.
-   **תלות בספקים:** Vercel, Supabase ו-OpenAI הם שירותים חיצוניים. שכבת
    Data Access ושכבת AI יהיו מופרדות לוגית כדי להקל על החלפה עתידית.

------------------------------------------------------------------------

## 2. ארכיטקטורת המערכת

### 2.1 מבט על

Budgi תיבנה כ-**Modular Monolith**: - אפליקציית Next.js אחת מכילה את
הממשק ואת שכבת ה-Backend. - Supabase מספק PostgreSQL ו-Authentication. -
OpenAI API נקרא רק מהשרת. - אין Microservices, Message Queue, Redis,
Vector Database או Backend עצמאי ב-MVP.

``` mermaid
flowchart TD
    U["משתמש בדפדפן"] --> V["Next.js Web App על Vercel"]
    V --> UI["Frontend: Dashboard, Campaigns, Settings, Advisor"]
    UI --> API["Server Actions ו-Route Handlers"]
    API --> AUTH["Supabase Auth"]
    API --> DB["Supabase PostgreSQL"]
    API --> CALC["Calculation & Forecast Services"]
    API --> IMPORT["CSV / Excel Import Service"]
    API --> AI["AI Advisor Service"]
    AI --> OAI["OpenAI API"]
    DB --> RLS["PostgreSQL RLS"]
    RLS --> DATA["נתוני המשתמש בלבד"]
    GH["GitHub Repository"] --> DEP["Vercel Build & Deployment"]
    DEP --> V
```

### 2.2 חלוקה ל-Modules

#### Frontend

1.  **Authentication UI** --- התחברות Google, טיפול ב-Session ויציאה.
2.  **Onboarding & Settings** --- הגדרה ראשונית (תקציב כולל ויעדים),
    ניהול יעדים, ספי התראות, יציאה ומחיקת חשבון.
3.  **Dashboard** --- מסכי בית, תקציב, מדדים ותחזית: KPI cards, גרפי
    מגמה שבועיים, טבלאות השוואה.
4.  **Campaign Management** --- רשימת קמפיינים, יצירה, ומסך פרטי קמפיין
    עם הזנה ועריכה של נתוני ביצועים שבועיים.
5.  **Data Import** --- העלאת קובץ, התאמת עמודות, תצוגה מקדימה, אישור
    ותוצאת הייבוא.
6.  **Alert Center** --- התראות קופצות והיסטוריית התראות.
7.  **AI Budget Advisor** --- ממשק שיחה והצגת המלצות מובנות.
8.  **Legal pages** --- דפי תנאי שימוש ומדיניות פרטיות, נגישים גם ללא
    התחברות.

#### Backend

1.  **Authentication & Session Layer** --- אימות משתמש ובדיקת Session
    בכל פעולה מוגנת.
2.  **Campaign Service** --- CRUD לקמפיינים ולשורות ביצועים שבועיות;
    מחיקת קמפיין רק כשאין לו נתונים.
3.  **Budget & Goal Service** --- שמירת תקציב כולל חודשי, תקציבי קמפיינים
    חודשיים ויעדים חודשיים, כולל העתקה אוטומטית לחודש חדש.
4.  **Import Service** --- פענוח CSV/Excel, התאמת עמודות, ולידציה, זיהוי
    קמפיין ושבוע, תצוגה מקדימה וכתיבה מבוקרת.
5.  **Metrics Service** --- חלוקת שבועות לחודשים וחישוב מדדים מספריים.
6.  **Forecast Service** --- חישוב תחזית חודשית לפי השיטה ב-PRD 4.5.
7.  **Alert Service** --- הערכת תנאי התראה לאחר שינוי נתונים ושמירת
    התראות.
8.  **AI Advisor Service** --- בניית הקשר נתונים מצומצם, קריאה ל-OpenAI,
    ולידציה, מגבלת 20 שאלות ביום והחזרת תשובה.
9.  **Account Service** --- מחיקת חשבון וכל הנתונים.
10. **Data Access Layer** --- גישה למסד הנתונים דרך Supabase client
    מאובטח.

### 2.3 מבנה לוגי של הקוד

מומלץ לארגן את הקוד לפי תחומי אחריות ולא לפי סוגי קבצים בלבד:

``` text
src/
  app/
    (auth)/
      login/
    (legal)/
      terms/
      privacy/
    (app)/
      onboarding/
      dashboard/
      budget/
      metrics/
      forecast/
      campaigns/
      imports/
      alerts/
      advisor/
      settings/
    api/
      imports/
      advisor/
  components/
    ui/
    dashboard/
    campaigns/
    alerts/
    advisor/
  features/
    auth/
    campaigns/
    budgets/
    goals/
    imports/
    metrics/
    forecasts/
    alerts/
    advisor/
  lib/
    supabase/
    validation/
    dates/
    currency/
  server/
    services/
    repositories/
    ai/
    import/
supabase/
  migrations/
tests/
  unit/
  integration/
  rls/
  e2e/
```

הדוגמה היא מבנה לוגי מומלץ, לא דרישה למימוש כל תיקייה כיחידה נפרדת. יש
לשמור על כלל: קוד שרת וסודות אינם מיובאים לרכיבי Client.

------------------------------------------------------------------------

## 3. Data Model

### 3.1 עקרונות

-   PostgreSQL הוא מקור האמת היחיד לנתוני העסק.
-   כל רשומה עסקית משויכת ל-`user_id` של בעל החשבון.
-   כל הסכומים נשמרים ב-ILS, באמצעות `numeric(12,2)` ולא `float`, כדי
    למנוע שגיאות עיגול כספי. לידים, עסקאות ולקוחות חדשים נשמרים כ-`integer`.
-   **יחידות זמן קבועות:**
    -   נתוני ביצועים נשמרים לפי **שבוע**: שורה אחת לכל קמפיין לכל שבוע,
        מזוהה ב-`week_start` (תאריך של יום ראשון).
    -   תקציבים ויעדים נשמרים לפי **חודש**: מזוהים ב-`month` (תאריך של
        היום הראשון בחודש).
-   שדות ביצועים שלא הוזנו נשמרים כ-`NULL` ולא כ-0, כדי להבדיל בין "לא
    הוזן" לבין אפס.
-   `created_at` ו-`updated_at` נשמרים ב-UTC; תצוגה וחישובי גבולות
    יום/שבוע/חודש מתבצעים לפי אזור הזמן `Asia/Jerusalem`.
-   ב-MVP אין ישות Business נפרדת עם חברות צוות: משתמש אחד מנהל עסק אחד.

### 3.2 ישויות מרכזיות

| Entity / Table | שדות עיקריים | תפקיד וקשרים |
|---|---|---|
| `profiles` | `id` (UUID, FK ל-`auth.users`), `display_name`, `email`, `business_name`, `onboarding_completed_at`, `created_at` | פרופיל משתמש; `onboarding_completed_at` ריק עד סיום ההגדרה הראשונית. `business_name` אופציונלי (עד 100 תווים, בלי רווחים בקצוות) — מוצג בכותרת במקום השם מ-Google. השם והאימייל לקריאה בלבד; המשתמש יכול לעדכן רק את `business_name` (הרשאת עמודה) |
| `budgets` | `id`, `user_id`, `month`, `planned_amount`, `created_at`, `updated_at` | תקציב שיווק כולל לחודש. Unique על `(user_id, month)` |
| `campaigns` | `id`, `user_id`, `name`, `platform`, `status`, `description`, `created_at`, `updated_at` | קמפיין. `platform` ∈ `meta_ads`, `google_ads`, `tiktok_ads`, `linkedin_ads`. `status` ∈ `active`, `paused`, `ended`. Unique על `(user_id, lower(trim(name)), platform)` |
| `campaign_budgets` | `id`, `user_id`, `campaign_id`, `month`, `planned_amount`, `updated_at` | תקציב מתוכנן לקמפיין לחודש. Unique על `(campaign_id, month)` |
| `campaign_performance` | `id`, `user_id`, `campaign_id`, `week_start`, `spend`, `leads`, `deals`, `new_customers`, `revenue`, `source`, `created_at`, `updated_at` | ביצועים לשבוע. `source` ∈ `manual`, `import`. Unique על `(campaign_id, week_start)` --- מונע כפילויות וחפיפות |
| `business_goals` | `id`, `user_id`, `month`, `goal_type`, `target_value`, `updated_at` | יעד חודשי. `goal_type` ∈ `revenue`, `deals`, `leads`, `min_roas`. Unique על `(user_id, month, goal_type)` |
| `alert_settings` | `id`, `user_id`, `alert_type`, `threshold_config`, `enabled`, `updated_at` | `alert_type` ∈ `spend_pace`, `budget_overrun`, `performance_drop`, `goal_risk`, `goal_reached`. ערכי ברירת מחדל לפי PRD 4.6. Unique על `(user_id, alert_type)` |
| `alerts` | `id`, `user_id`, `alert_type`, `severity`, `title`, `description`, `related_campaign_id`, `month`, `dedupe_key`, `deviation`, `created_at`, `read_at` | התראות שנוצרו ונשמרות במרכז ההתראות. `severity` ∈ `info`, `warning`, `critical` |
| `advisor_usage` | `user_id`, `usage_date`, `question_count` | מונה שאלות יומי למגבלת 20 שאלות. מפתח ראשי `(user_id, usage_date)` |
| `advisor_insights` | `id`, `user_id`, `question`, `reply` (JSONB), `created_at` | תשובת Advisor שהמשתמש בחר לשמור (PRD 4.7): השאלה והתשובה כפי שהוצגו ברגע השמירה. `reply` נבדק ב-Zod בשמירה ובקריאה |
| `import_jobs` | `id`, `user_id`, `file_name`, `status`, `rows_total`, `rows_imported`, `rows_rejected`, `campaigns_created`, `error_summary`, `created_at`, `completed_at` | תיעוד תהליך ייבוא ותוצאותיו; קובץ המקור אינו נשמר |

**הערות תכנון:**

-   **חלוקת שבוע לחודשים:** החלוקה מחושבת בקוד (Metrics Service) ולא
    נשמרת. לכל שבוע ולכל חודש: `שווי בחודש = ערך השבוע × (ימי השבוע
    שבחודש ÷ 7)`. מספרים שלמים שחולקו נשארים שבר בחישוב ומעוגלים רק
    בתצוגה.
-   **העתקה לחודש חדש:** כאשר המשתמש ניגש לחודש שאין לו `budgets`,
    `business_goals` או `campaign_budgets` לקמפיינים פעילים, Budget & Goal
    Service יוצר אותם מהחודש האחרון שבו הוגדרו. אין צורך ב-Cron.
-   **מחיקת קמפיין:** מותרת רק כשאין לו שורות ב-`campaign_performance`.
    הבדיקה נאכפת בשרת וגם ב-DB (Foreign Key עם `ON DELETE RESTRICT` מ-
    `campaign_performance` ל-`campaigns`).
-   **בייבוא:** התאמה לקמפיין לפי שם (ללא רישיות ורווחים בקצוות)
    ופלטפורמה; התאמה לשורה קיימת לפי `(campaign_id, week_start)`.
-   `threshold_config` יישמר כ-JSONB, אך מבנה הערכים יאומת באמצעות Zod
    בצד השרת.
-   שיחות ה-Advisor אינן נשמרות ב-DB; רק מונה השאלות היומי ותשובות שהמשתמש בחר לשמור כתובנות (`advisor_insights`).

### 3.3 קשרים בין הישויות

``` mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : owns
    AUTH_USERS ||--o{ BUDGETS : sets
    AUTH_USERS ||--o{ CAMPAIGNS : owns
    CAMPAIGNS ||--o{ CAMPAIGN_BUDGETS : allocated
    CAMPAIGNS ||--o{ CAMPAIGN_PERFORMANCE : records
    AUTH_USERS ||--o{ BUSINESS_GOALS : defines
    AUTH_USERS ||--o{ ALERT_SETTINGS : configures
    AUTH_USERS ||--o{ ALERTS : receives
    CAMPAIGNS o|--o{ ALERTS : relates
    AUTH_USERS ||--o{ ADVISOR_USAGE : counts
    AUTH_USERS ||--o{ ADVISOR_INSIGHTS : saves
    AUTH_USERS ||--o{ IMPORT_JOBS : imports
```

### 3.4 אינדקסים ואילוצים

-   אינדקס על `user_id` בכל טבלה עסקית.
-   אינדקס על `(user_id, week_start)` ב-`campaign_performance`, ועל
    `(user_id, month)` בטבלאות התקציב והיעדים.
-   Unique constraints כמפורט בטבלה בסעיף 3.2.
-   `CHECK (extract(dow from week_start) = 0)` --- `week_start` הוא תמיד
    יום ראשון.
-   `CHECK (extract(day from month) = 1)` --- `month` הוא תמיד היום הראשון
    בחודש.
-   `CHECK` constraints למניעת ערכים שליליים ב-`spend`, `revenue`,
    `planned_amount`, `target_value`, `leads`, `deals`, `new_customers`.
-   `CHECK` שבשורת ביצועים לפחות אחד מחמשת השדות המספריים אינו `NULL`.
-   אין להניח שמספר לקוחות חדשים חייב להיות שווה למספר העסקאות.
-   Foreign Keys מ-`auth.users` לכל הטבלאות עם `ON DELETE CASCADE`, כך
    שמחיקת המשתמש מוחקת את כל נתוניו. בין `campaign_performance`
    ל-`campaigns`: `ON DELETE RESTRICT`.
-   אין להשתמש ב-`float` לשדות כספיים.

------------------------------------------------------------------------

## 4. APIs ותקשורת בין רכיבים

### 4.1 עקרונות

-   פעולות CRUD פשוטות יכולות להתבצע באמצעות Server Actions או Server
    Components, לפי הצורך.
-   פעולות שדורשות קובץ או חוזה API מפורש יבוצעו באמצעות Route Handlers.
-   כל פעולת Backend תבדוק Session ו-Authorization לפני קריאה או כתיבה.
-   אין לחשוף OpenAI API Key או Supabase Secret/Service Role Key לדפדפן.
-   ה-Frontend לא יקבל גישה מנהלית למסד הנתונים.

### 4.2 ממשקי API מרכזיים

| Method | Endpoint | תפקיד |
|---|---|---|
| `GET` | `/api/dashboard?period=month&value=2026-10` או `?period=week&value=2026-10-25` | KPI, סיכומים ומגמות לחודש או לשבוע |
| `GET` | `/api/forecast?month=2026-10` | תחזית לחודש (או נתונים בפועל לחודש שהסתיים) |
| `GET` / `PUT` | `/api/budgets?month=...` | תקציב כולל ותקציבי קמפיינים לחודש |
| `GET` / `PUT` | `/api/goals?month=...` | יעדים לחודש |
| `GET` | `/api/campaigns` | רשימת קמפיינים של המשתמש |
| `POST` | `/api/campaigns` | יצירת קמפיין |
| `GET` | `/api/campaigns/:id` | פרטי קמפיין ושורות הביצועים השבועיות שלו |
| `PATCH` | `/api/campaigns/:id` | עדכון קמפיין (כולל סטטוס) |
| `DELETE` | `/api/campaigns/:id` | מחיקת קמפיין; נדחית אם יש לו נתוני ביצועים |
| `PUT` | `/api/campaigns/:id/weeks/:weekStart` | יצירה או עדכון של שורת שבוע |
| `DELETE` | `/api/campaigns/:id/weeks/:weekStart` | מחיקת שורת שבוע |
| `POST` | `/api/imports/preview` | פענוח קובץ והחזרת כותרות, התאמת עמודות מוצעת ותצוגה מקדימה |
| `POST` | `/api/imports/commit` | שמירת השורות התקינות ויצירת קמפיינים חדשים לאחר אישור המשתמש |
| `GET` | `/api/imports/template` | הורדת קובץ הדוגמה |
| `GET` | `/api/alerts` | רשימת התראות והיסטוריה |
| `PATCH` | `/api/alerts/:id` | סימון התראה כנקראה |
| `GET` / `PUT` | `/api/alert-settings` | קריאה ועדכון של ספי התראות |
| `POST` | `/api/advisor` | שליחת שאלה (עם הודעות השיחה הנוכחית) וקבלת ניתוח/המלצה |
| `POST` / `DELETE` | Server Actions של התובנות | שמירת תשובה כתובנה ומחיקת תובנה שמורה |
| `DELETE` | `/api/account` | מחיקת החשבון וכל הנתונים |

הטבלה מתארת חוזה לוגי מוצע. ניתן לממש חלק מהפעולות כ-Server Actions בלי
Endpoint ציבורי נפרד, כל עוד גבולות האבטחה והאחריות נשמרים.

### 4.3 חוזה תשובת AI

השרת ידרוש פלט מובנה שכולל, לפי הצורך:

-   `answer`: הסבר בשפה טבעית בעברית.
-   `recommendations`: מערך המלצות, שבכל אחת:
    -   `campaign_ids`: מזהי הקמפיינים הרלוונטיים.
    -   `action_type`: `increase`, `decrease` או `reallocate`.
    -   `amount_ils` ו/או `percentage`.
    -   `rationale`: הסבר מבוסס נתונים.
    -   `expected_impact`: הערכה צפויה, אם אפשר לחשב או להעריך.
-   `limitations`: נתונים חסרים והסתייגויות.
-   `missing_data_request`: מה המשתמש צריך להזין או לייבא, כשאין די נתונים.

כל פלט יעבור Zod validation לפני החזרה ל-Frontend. ה-AI אינו רשאי לבצע
פעולות כתיבה לתקציבים או לפלטפורמות פרסום.

------------------------------------------------------------------------

## 5. Data Flow

### 5.1 הזנה ידנית ועדכון מדדים

1.  המשתמש מתחבר באמצעות Google.
2.  ה-Frontend שולח פעולה לשרת עם Session תקף.
3.  השרת מאמת את המשתמש ומוודא שכל מזהי הרשומות שייכים אליו.
4.  הנתונים עוברים ולידציה באמצעות Zod ובדיקות DB constraints. תאריך
    שבוע מנורמל ליום ראשון של אותו שבוע.
5.  הנתונים נשמרים ב-PostgreSQL.
6.  השרת מפעיל Alert Service. המדדים מחושבים בזמן הקריאה (אין טבלאות
    סיכום שמורות).
7.  Dashboard מקבל נתונים מחושבים ומציג מדדים זמינים בלבד.

### 5.2 ייבוא CSV / Excel

1.  המשתמש בוחר קובץ ומעלה אותו ל-`/api/imports/preview`.
2.  Route Handler בודק סוג קובץ (CSV/XLSX), גודל (עד 5MB), מספר שורות
    (עד 5,000) ומבנה בסיסי.
3.  SheetJS/CSV parser קורא את הנתונים בשרת.
4.  Import Service מציע התאמת עמודות: אוטומטית אם הכותרות תואמות לקובץ
    הדוגמה, אחרת לפי בחירת המשתמש. ההתאמה הסופית נשלחת מחדש עם הקובץ.
5.  Import Service מנרמל תאריכים (DD/MM/YYYY או YYYY-MM-DD, ונרמול ליום
    ראשון), מספרים ושמות פלטפורמה (Facebook/Instagram → Meta Ads), ומריץ
    ולידציה.
6.  לכל שורה נקבע סטטוס: חדשה, עדכון לשורה קיימת, שגיאה (עם סיבה), ולכל
    קמפיין שלא קיים: "ייווצר קמפיין חדש".
7.  לאחר אישור המשתמש, `/api/imports/commit` יוצר את הקמפיינים החדשים
    ומבצע Upsert לפי `(campaign_id, week_start)` בתוך Transaction אחת.
    שדה ריק בקובץ אינו דורס ערך קיים.
8.  מתעדכן `import_jobs`, ומופעל Alert Service.
9.  הקובץ אינו נשמר; אין צורך ב-Persistent File Storage ב-MVP.

### 5.3 חישובי מדדים

החישובים יבוצעו בקוד שרת דטרמיניסטי, ולא באמצעות LLM:

-   **סיכום לתקופה:** לשבוע --- ערכי השורה כפי שהם. לחודש --- סכום ערכי
    השבועות לאחר חלוקה יחסית לפי ימים (ראו 3.2).
-   `CPL = spend / leads`
-   `Cost per Deal = spend / deals`
-   `CAC = spend / new_customers`
-   `ROAS = revenue / spend`
-   `Conversion Rate = deals / leads × 100`
-   `Remaining Budget = planned_budget - actual_spend`
-   `Budget Gap = total_monthly_budget - Σ campaign_monthly_budgets`

כל מדד מחושב רק משורות שבהן גם המונה וגם המכנה הוזנו (לא `NULL`). אם
המכנה הוא 0 או חסר, התוצאה תהיה `null` / Not Available עם סיבת החוסר.

### 5.4 תחזית חודשית

Forecast Service מממש את השיטה שב-PRD 4.5:

1.  `covered_days` = מספר ימי החודש מתחילתו ועד סוף השבוע האחרון שיש לו
    נתונים (לכל הקמפיינים יחד), לכל היותר עד סוף החודש.
2.  אם `covered_days < 7` --- התחזית `null` עם סיבה "אין מספיק נתונים".
3.  `pace_forecast = month_to_date / covered_days × days_in_month`.
4.  אם יש לפחות שני חודשים קודמים עם נתונים, `history_avg` = ממוצע הסכום
    החודשי של עד שלושת החודשים הקודמים, ו-`forecast = 0.7 × pace_forecast
    + 0.3 × history_avg`. אחרת `forecast = pace_forecast`.
5.  התשובה כוללת `basis`: `pace` או `pace_and_history`.

-   התחזית מחושבת להוצאות, להכנסות, ללידים ולעסקאות. ROAS צפוי =
    הכנסות צפויות ÷ הוצאות צפויות.
-   יש להפריד בין `actual`, `forecast` ו-`target` בתשובת השרת ובתצוגה.
-   ה-AI יכול להסביר את התחזית אך לא להמציא או לשנות את המספרים.

### 5.5 תהליך התראות

-   לאחר כל שמירה ידנית (נתונים, תקציב, יעד) או Commit של ייבוא, Alert
    Service מחשב את התנאים שב-PRD 4.6 לחודש הנוכחי, לפי `alert_settings`
    של המשתמש.
-   `dedupe_key = alert_type + entity (business או campaign_id) + month`.
    לפני יצירת התראה, השירות בודק אם קיימת התראה עם אותו `dedupe_key`
    שנוצרה באותו שבוע קלנדרי. אם כן, נוצרת התראה חדשה רק אם `deviation`
    הנוכחית גדולה מהקודמת לפחות בגודל הסף.
-   ההתראה נשמרת ב-DB ומוחזרת ל-Frontend בתשובה לפעולת השמירה; הודעה
    קופצת מוצגת מיד.
-   אין צורך ב-Cron או Background Worker ב-MVP.

### 5.6 תהליך AI Budget Advisor

1.  המשתמש שולח שאלה, יחד עם ההודעות הקודמות של השיחה הנוכחית (מוגבל
    ל-10 ההודעות האחרונות). השיחה נשמרת רק בדפדפן ונעלמת ביציאה מהמסך.
2.  השרת מאמת Session ובודק ב-`advisor_usage` שהמשתמש לא עבר 20 שאלות
    היום (לפי אזור הזמן של ישראל). אם עבר --- מחזיר הודעה מתאימה בלי לפנות
    ל-OpenAI.
3.  Advisor Service שולף רק נתונים השייכים למשתמש.
4.  Metrics/Forecast Services מחשבים מדדים, מגמות ותחזיות באופן
    דטרמיניסטי.
5.  השרת בונה Context מצומצם ומסיר פרטים שאינם נחוצים.
6.  השרת שולח ל-OpenAI API את השאלה, המדדים וההקשר העסקי הרלוונטי, ללא
    מפתחות או פרטי Authentication.
7.  OpenAI מחזיר Structured Output לפי JSON Schema.
8.  השרת מאמת את הפלט, בודק שמזהי הקמפיינים קיימים ושסכומי ההמלצה אינם
    חורגים מהנתונים הזמינים, ומעלה את מונה השאלות.
9.  השרת מחזיר תשובה בעברית עם הסבר, סכום/אחוז מוצע והסתייגויות, ואת
    מספר השאלות שנותרו היום.
10. לא מתבצעת כתיבה אוטומטית לתקציב או לפלטפורמת פרסום.

------------------------------------------------------------------------

## 6. Authentication, Authorization ואבטחה

### 6.1 Authentication

-   Supabase Auth ינהל התחברות Google OAuth. זה ספק ההתחברות היחיד
    בממשק.
-   יש להגדיר Google OAuth Client ב-Google Cloud Console ולהזין את
    Client ID ו-Client Secret ב-Supabase Dashboard.
-   יש להגדיר Redirect URLs ל-Development ול-Production בנפרד.
-   ב-Next.js יש להשתמש ב-Supabase SSR client וב-Cookie-based Sessions
    בהתאם לתיעוד Supabase ל-Next.js.
-   דפים מוגנים ופעולות שרת יוודאו Session תקף; אין להסתמך על הסתרת
    מסכים ב-Frontend בלבד.
-   משתמש מחובר שעדיין לא השלים הגדרה ראשונית (`onboarding_completed_at`
    ריק) מופנה למסך ההגדרה הראשונית.
-   **משתמשי בדיקה:** בפרויקט `budgi-dev` בלבד מופעל גם ספק Email/Password
    של Supabase, עם שני משתמשי בדיקה קבועים. הממשק אינו מציג אפשרות זו;
    הבדיקות האוטומטיות מתחברות דרכה בקוד (ראו 8.1). ב-`budgi-prod` הספק
    הזה כבוי.

### 6.2 Authorization ו-RLS

-   להפעיל RLS על כל טבלה עסקית בסכמת `public`.
-   כל טבלה עסקית תכלול `user_id` ותוגדר מדיניות שמאפשרת למשתמש לקרוא
    ולשנות רק רשומות שבהן `user_id = auth.uid()`.
-   פעולות INSERT יבדקו `WITH CHECK`; פעולות UPDATE יבדקו גם `USING` וגם
    `WITH CHECK`.
-   יש להגדיר Grants מצומצמים לתפקידי `anon` ו-`authenticated`; הפעלת
    RLS לבדה אינה תחליף לניהול Grants.
-   יש לכתוב בדיקות RLS שמוודאות שמשתמש A אינו יכול לקרוא, לשנות או
    למחוק נתונים של משתמש B.
-   אין להסתמך על `user_metadata` שניתן לשינוי על ידי משתמש לצורך
    הרשאות.
-   `service_role` / Secret Key עוקף RLS ויש להשתמש בו רק בקוד שרת
    למשימות מערכת הכרחיות --- ב-MVP רק למחיקת חשבון (מחיקת המשתמש
    מ-`auth.users`). אין לחשוף אותו ל-Client. פעולות משתמש רגילות
    מתבצעות עם Session המשתמש ו-RLS.

מקור: [Supabase Row Level
Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 6.3 הגנה על קבצים

-   לקבל רק CSV ו-XLSX, עד 5MB ועד 5,000 שורות.
-   לבצע Parsing וולידציה בצד השרת.
-   לא לסמוך על סיומת הקובץ בלבד; לבדוק MIME/signature ומבנה תוכן ככל
    האפשר.
-   להימנע מהפעלת Macros; לא להריץ תוכן מתוך קבצים.
-   למנוע Formula Injection בקובץ הדוגמה ובכל ייצוא עתידי לקובצי CSV.
-   לא לשמור קובץ מקור.

### 6.4 הגנה על AI

-   OpenAI API Key נשמר כ-Environment Variable בשרת בלבד.
-   מגבלה של 20 שאלות ביום לכל משתמש (`advisor_usage`), מגבלת אורך
    לשאלה (1,000 תווים) ולהקשר השיחה (10 הודעות אחרונות), ומגבלת Tokens
    לתשובה.
-   בנוסף, תקרת הוצאה חודשית (Usage limit) מוגדרת בחשבון OpenAI עצמו על
    ידי בעל המוצר.
-   אין לשלוח למודל פרטי Google OAuth, Tokens, סיסמאות או מידע אישי
    שאינו נדרש לניתוח (שם ואימייל המשתמש אינם נשלחים).
-   יש להתייחס לתוכן שהמשתמש הזין ולקובצי הייבוא כנתונים, לא כהוראות
    מערכת למודל.
-   המודל לא מקבל כלים שמאפשרים כתיבה למסד הנתונים או שינוי תקציב.
-   כל סכום/אחוז שיוצג כהמלצה חייב לעבור בדיקות לוגיות בצד השרת.

### 6.5 פרטיות ושמירת נתונים

-   כל משתמש רואה רק את נתוניו.
-   דפי תנאי שימוש ומדיניות פרטיות קיימים באפליקציה (`/terms`,
    `/privacy`); הנוסח המשפטי מסופק על ידי בעל המוצר לפני השקה.
-   **מחיקת חשבון:** `DELETE /api/account` מאמת את ה-Session, מוחק את
    המשתמש מ-`auth.users` באמצעות Service Role Key בצד השרת, וכל נתוני
    העסק נמחקים ב-Cascade. לאחר מכן ה-Session מתבטל.
-   יש להימנע מלוגים המכילים תוכן פיננסי מפורט או פרטי משתמש שאינם
    נחוצים.
-   שיחות Advisor וקובצי ייבוא אינם נשמרים (מלבד תובנות שהמשתמש בחר לשמור, שנמחקות יחד עם החשבון). `import_jobs` שומר רק סיכום
    מספרי ושמות קבצים.

------------------------------------------------------------------------

## 7. Environments, GitHub, Migrations ו-Deployment

### 7.1 סביבות נפרדות

| סביבה | Supabase Project | שימוש | מתי מוקמת |
|---|---|---|---|
| Development | `budgi-dev` | פיתוח, בדיקות, נתוני דמה, משתמשי בדיקה; משמש את המחשב המקומי ואת גרסאות ה-Preview ב-Vercel | אבן דרך 1 |
| Production | `budgi-prod` | האתר החי ונתוני משתמשים אמיתיים; אין חיבור מהמחשב המקומי | אבן הדרך האחרונה (הקשחה ופריסה) |

הפרדה זו מונעת מצב שבו בדיקות או ניסויים פוגעים בנתוני משתמשים אמיתיים.
עד אבן הדרך האחרונה אין סביבת Production כלל, ולכן אין סיכון לפרוס אליה
בטעות.

### 7.2 Environment Variables

#### מקומי --- Development בלבד

קובץ `.env` במחשב המפתח (מוחרג מ-Git; `.env.example` מכיל את השמות
בלבד):

``` env
NEXT_PUBLIC_SUPABASE_URL=https://<DEV_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<DEV_PUBLISHABLE_KEY>
OPENAI_API_KEY=<DEVELOPMENT_OPENAI_KEY>
APP_ENV=development
E2E_USER_A_EMAIL=
E2E_USER_A_PASSWORD=
E2E_USER_B_EMAIL=
E2E_USER_B_PASSWORD=
```

-   `OPENAI_API_KEY` נוסף רק באבן הדרך של ה-AI Advisor.
-   `SUPABASE_SERVICE_ROLE_KEY` נדרש רק למחיקת חשבון, ונוסף באבן הדרך
    האחרונה.
-   משתני `E2E_*` הם פרטי משתמשי הבדיקה בפרויקט `budgi-dev` בלבד.

#### Vercel --- Preview

-   משתני Supabase של Development בלבד.
-   מפתח OpenAI ייעודי לסביבת Preview/Development.
-   אין להכניס ערכי Production ל-Preview.

#### Vercel --- Production

-   מוגדר רק באבן הדרך האחרונה.
-   משתני Supabase של Production בלבד, מפתח OpenAI של Production
    ו-`SUPABASE_SERVICE_ROLE_KEY` של Production.
-   כל Secrets נשמרים ב-Vercel Environment Variables ומוגדרים
    כ-Production בלבד.
-   פרטי Production אינם נשמרים בקובצי המחשב המקומי או ב-GitHub.

**חשוב:**

-   `NEXT_PUBLIC_*` מיועד רק לערכים שמותר לחשוף לדפדפן, כגון Supabase URL
    ו-Publishable/Anon Key המוגן באמצעות RLS.
-   `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ומשתני `E2E_*` הם
    Server-only ואסור להוסיף להם prefix של `NEXT_PUBLIC_`.
-   אין להעלות `.env` ל-Git. יש לכלול `.env.example` עם שמות משתנים
    בלבד.
-   יש להשתמש במפתחות נפרדים לכל סביבה.

### 7.3 GitHub Repository ו-Branches

-   כל קוד המקור ינוהל ב-GitHub Repository פרטי.
-   **`main`** הוא ענף העבודה. כל דחיפה אליו יוצרת ב-Vercel גרסת
    **Preview** שמחוברת ל-`budgi-dev`.
-   **`production`** הוא ענף ה-Production. ב-Vercel מוגדר ש-Production
    Branch הוא `production` (ולא `main`). הענף נוצר רק באבן הדרך האחרונה.
-   קידום גרסה ל-Production נעשה רק בעדכון ענף `production` לגרסה של
    `main`, לאחר שה-Migrations הורצו על `budgi-prod` ובאישור מפורש של
    המשתמש.
-   אין לבצע Deployment ידני; Vercel מפעיל Build ו-Deployment אוטומטיים
    בעקבות Git events.

### 7.4 Build ו-Deployment

**עד אבן הדרך האחרונה:**

1.  בסיום כל אבן דרך והאישור שלה, הקוד נדחף ל-`main`.
2.  Vercel מפעיל Install ו-Build ויוצר Preview URL המחובר ל-`budgi-dev`.
3.  המשתמש יכול לבדוק את הגרסה בכתובת ה-Preview.

**מאבן הדרך האחרונה ואילך (קידום ל-Production):**

1.  הקוד ב-`main` נבדק ב-Preview.
2.  Migrations חדשות מורצות על `budgi-prod` לפי הנוהל בסעיף 7.5.
3.  רק לאחר הצלחתן, ענף `production` מתעדכן לגרסה של `main`.
4.  Vercel יוצר Production Deployment.
5.  מבצעים Smoke Test לכניסה, Dashboard, שמירת נתונים ו-AI.

כך קוד חדש לעולם אינו מגיע ל-Production לפני שהסכמה שהוא תלוי בה קיימת
שם.

### 7.5 Database Migrations --- נוהל מחייב

כל שינוי בסכמת PostgreSQL ינוהל באמצעות SQL Migration שנשמר ב-GitHub תחת
`supabase/migrations/`. אין לבצע שינוי סכימה ידני ב-Production ללא
Migration תואם ב-Repository.

**תהליך שינוי רגיל:**

1.  יוצרים Migration חדש.
2.  מחברים את Supabase CLI לפרויקט `budgi-dev`.
3.  מריצים את ה-Migration על Development.
4.  בודקים שהאפליקציה פועלת, שהנתונים נשמרים ושה-RLS והאילוצים תקינים.
5.  מריצים בדיקות DB/RLS.
6.  הקוד נדחף ל-`main` (Preview בלבד).
7.  כשמקדמים ל-Production (מאבן הדרך האחרונה ואילך): לאחר אישור מפורש
    של המשתמש, מריצים את ה-Migrations שעדיין לא הורצו על `budgi-prod`.
8.  לאחר הצלחת ה-Migration ובדיקת תקינות, מעדכנים את ענף `production`.
9.  מבצעים Smoke Test. במקרה כשל, לא מקדמים את הגרסה ומפעילים נוהל
    תיקון.

**כלל סדר פריסה:**

-   שינוי Additive ותואם לאחור: ניתן להוסיף עמודה/טבלה, לפרוס קוד שתומך
    במבנה החדש, ורק בהמשך להסיר מבנה ישן ב-Migration נפרד.
-   שינוי Breaking: יש לתכנן מעבר מדורג. לא לפרוס קוד שמצפה לעמודה/טבלה
    שעדיין לא קיימת.
-   אין להריץ Migration אוטומטית כחלק מ-Build.
-   Production Migration דורשת אישור מפורש של המשתמש/בעל המוצר לפני
    ההרצה.

דוגמת פקודות CLI (ההרצה תיעשה על ידי המפתח או גורם טכני, לא נדרשת התקנה
במחשב המשתמש):

``` bash
supabase link --project-ref <DEV_PROJECT_REF>
supabase db push

# לאחר בדיקה ואישור, מקשרים לפרויקט Production:
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
```

יש לוודא שה-CLI משתמש ב-Access Token ובפרטי החיבור הנכונים לסביבה; אין
לשמור Credentials בתוך קובצי Migration.

### 7.6 הגדרות שאינן עוברות ב-Migrations

SQL Migrations מעבירות סכמת DB, Policies, Functions, Triggers, Indexes
ונתוני Seed מבוקרים. הן אינן מחליפות את הגדרות השירות והסודות הבאות; יש
להגדיר ולבדוק אותן בנפרד בכל פרויקט Supabase:

-   Google OAuth Provider: Client ID, Client Secret, Redirect URLs
    והגדרות Consent Screen.
-   Site URL ו-Redirect URL allowlist של Supabase Auth.
-   ספק Email/Password: מופעל ב-`budgi-dev` בלבד (למשתמשי הבדיקה), כבוי
    ב-`budgi-prod`.
-   API Keys ו-Secrets.
-   הגדרות Billing, Compute, Backups ו-Region.
-   הגדרות Logging ו-Retention.

ב-MVP אין צורך ב-Supabase Storage, משום שקובצי הייבוא מעובדים זמנית
ואינם נשמרים.

### 7.7 Supabase Free --- מגבלות שחשוב להכיר

לפי תיעוד Supabase שנבדק:

-   תוכנית Free מאפשרת עד שני פרויקטים פעילים. שני הפרויקטים הנדרשים כאן
    יכולים להתאים למכסה זו, כל עוד לא נוצרים פרויקטים נוספים
    בחשבונות/Organizations שבהם המשתמש Owner או Admin.
-   פרויקט Free בעל פעילות נמוכה במשך כשבוע עלול להיעצר אוטומטית. הנתונים
    נשמרים, אך השירות אינו זמין עד שחוזרים ומחדשים את הפרויקט.
-   תוכניות בתשלום אינן עוצרות פרויקטים בגלל חוסר פעילות.
-   חיוב Supabase מתבצע ברמת Organization; כל Organization משתמשת בתוכנית
    אחת. בפרויקט נוסף בתוכנית Pro עשויה להיות עלות Compute נוספת.
-   לכן Free מתאים להתחלה ולבדיקות, אך ל-Production של מוצר אמיתי מומלץ
    לתקצב תוכנית בתשלום. אם Development נשאר ב-Free, יש להביא בחשבון
    השהיה אפשרית.

מקורות: [Free Project
Pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[Billing on
Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase),
[Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq).

------------------------------------------------------------------------

## 8. איכות, בדיקות וניטור

### 8.1 בדיקות

-   **Unit Tests (Vitest):** נוסחאות CPL, CAC, Cost per Deal, ROAS,
    Conversion Rate, חלוקת שבוע לחודשים, קצב תקציב, תחזית (כולל סף 7
    הימים ושילוב ההיסטוריה) ותנאי ההתראות.
-   **Validation Tests:** נתונים חסרים, אפס במכנה, ערכים שליליים, ערכים
    לא שלמים, נרמול תאריך ליום ראשון ונתוני ייבוא לא תקינים.
-   **RLS Tests (Vitest מול `budgi-dev`):** הבדיקות מתחברות כמשתמש בדיקה
    A וכמשתמש בדיקה B באמצעות Supabase client, ומוודאות שמשתמש אחד אינו
    יכול לקרוא, לשנות או למחוק נתונים של השני. אין צורך ב-Docker או במסד
    נתונים מקומי.
-   **Integration Tests:** יצירה ועדכון קמפיין, שורות שבוע, ייבוא קובץ,
    יצירת התראה ומניעת כפילויות, שמירת יעדים והעתקה לחודש חדש.
-   **End-to-End (Playwright מול סביבה מקומית שמחוברת ל-`budgi-dev`):**
    לפני הבדיקות, סקריפט הכנה מתחבר כמשתמש בדיקה דרך Email/Password של
    Supabase ושומר את ה-Session לשימוש הבדיקות. כך הבדיקות עוקפות את מסך
    Google. התרחישים: הגדרה ראשונית, יצירת קמפיין, הזנת שבוע, ייבוא,
    Dashboard, התראות וזרימת Advisor.
-   **התחברות Google עצמה** נבדקת ידנית בכל אבן דרך שנוגעת בה, כי לא ניתן
    לבצע אותה באופן אוטומטי.
-   **AI Contract Tests:** תשובות תקינות לפי JSON Schema; טיפול
    ב-refusal, timeout, תשובה חלקית או פלט שאינו עובר validation. בבדיקות
    האוטומטיות הקריאה ל-OpenAI מוחלפת בתשובה קבועה (Mock), כדי שלא תהיה
    עלות.
-   **נגישות:** בדיקה אוטומטית באמצעות axe (דרך Playwright) ובדיקה ידנית
    של ניווט מקלדת באבן הדרך האחרונה.

### 8.2 ניטור וטיפול בתקלות

-   שימוש ב-Vercel Runtime Logs לאיתור שגיאות API ו-Functions.
-   שימוש ב-Supabase Logs לניטור שגיאות Database ו-Auth.
-   לוגים יכללו Correlation ID, סוג פעולה, משך וזיהוי סביבה, אך לא API
    Keys, OAuth Tokens או תוכן פיננסי מלא.
-   שגיאות למשתמש יוצגו בעברית ובניסוח ברור; פרטי Stack Trace יוצגו רק
    בלוגים.
-   יש למדוד לפחות: שגיאות ייבוא, זמן תגובת Dashboard, כשלי AI,
    עלות/כמות בקשות AI ושגיאות DB.

------------------------------------------------------------------------

## 9. החלטות MVP והימנעות מ-Overengineering

הארכיטקטורה אינה כוללת במכוון: - Microservices או Backend נפרד. - Redis
או Message Queue. - Background Workers / Cron, משום שבדיקת ההתראות
מתבצעת בעת עדכון נתונים. - Vector Database או RAG framework: נתוני Budgi
מובנים ורלציוניים, ולכן שליפה וחישוב ישירים מתאימים יותר. - Supabase
Storage בשלב זה, כל עוד אין דרישה לשמירת קובצי מקור. - חיבורי API ל-Meta
Ads, Google Ads, TikTok Ads או LinkedIn Ads. - מודלי ML עצמאיים
לחיזוי. - מערכת הרשאות צוותית או Multi-tenant ארגוני מעבר להפרדה לפי
משתמש.

ניתן להוסיף רכיבים אלה בעתיד רק אם דרישות שימוש, עומס או מוצר יצדיקו
זאת.

------------------------------------------------------------------------

## 10. מקורות רשמיים

החלטות המסמך נשענות בעיקר על התיעוד והמחירונים הבאים, שנבדקו ב-30
באוקטובר 2026:

1.  [Next.js --- App Router](https://nextjs.org/docs/app)
2.  [Next.js --- Route
    Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
3.  [Supabase --- Authentication](https://supabase.com/docs/guides/auth)
4.  [Supabase --- Google
    Sign-In](https://supabase.com/docs/guides/auth/social-login/auth-google)
5.  [Supabase --- Row Level
    Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
6.  [Supabase --- Pricing](https://supabase.com/pricing)
7.  [Supabase ---
    Billing](https://supabase.com/docs/guides/platform/billing-on-supabase)
8.  [Supabase --- Free Project
    Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
9.  [Supabase --- Billing
    FAQ](https://supabase.com/docs/guides/platform/billing-faq)
10. [Vercel --- Git Deployments](https://vercel.com/docs/git)
11. [Vercel --- Pricing](https://vercel.com/pricing)
12. [Vercel --- Limits](https://vercel.com/docs/limits)
13. [OpenAI --- Structured
    Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

> המחירים, מכסות השימוש ומגבלות התוכניות עשויים להשתנות. לפני רכישת
> תוכנית או הפעלת Production יש לבדוק שוב את דפי התמחור וההגבלות
> הרשמיים.

------------------------------------------------------------------------

## החלטות מרכזיות (ADRs)

### ADR-1: נתוני ביצועים שבועיים

**הקשר:** תקופות חופשיות בנתוני הביצועים יצרו סיכון לחפיפות ולספירה כפולה,
והקשו על חישוב קצב ותחזית.

**החלטה:** שורה אחת לכל קמפיין לכל שבוע (ראשון--שבת), מזוהה
ב-`week_start`. תקציבים ויעדים חודשיים. שבוע שחוצה חודשים מתחלק לפי ימים.

**השלכות:** אין חפיפות (Unique על `(campaign_id, week_start)`). הגרפים
מציגים נקודה לכל שבוע. סיכומים חודשיים כוללים חלוקה יחסית, ומספרים שלמים
מעוגלים בתצוגה.

### ADR-2: Production רק באבן הדרך האחרונה, דרך ענף `production`

**הקשר:** חיבור `main` ל-Production היה גורם לכל דחיפה של אבן דרך לפרוס
לאתר החי לפני הרצת Migrations.

**החלטה:** `main` יוצר רק Preview המחובר ל-`budgi-dev`. `budgi-prod`
ומשתני Production ב-Vercel מוקמים באבן הדרך האחרונה. Production Branch
ב-Vercel הוא `production`, ומקודם רק אחרי הרצת Migrations על `budgi-prod`.

**השלכות:** תהליך הדחיפה הרגיל אינו יכול לפרוס ל-Production. קידום
ל-Production הוא פעולה נפרדת ומפורשת.

### ADR-3: משתמשי בדיקה ב-Development בלבד

**הקשר:** לא ניתן להתחבר עם Google באופן אוטומטי בבדיקות, ובדיקות DB
מקומיות דורשות Docker.

**החלטה:** ספק Email/Password מופעל רק ב-`budgi-dev`, עם שני משתמשי
בדיקה. Playwright ובדיקות ה-RLS מתחברים דרכם בקוד. בדיקות RLS רצות
ב-Vitest מול `budgi-dev`.

**השלכות:** התחברות Google נבדקת ידנית. ב-`budgi-prod` הספק כבוי.

### ADR-4: חיבור Vercel בלי Production Deployment ראשון

**הקשר:** ייבוא Repository דרך מסך הייבוא של Vercel יוצר מיד Production
Deployment מענף ברירת המחדל (`main`), עוד לפני שאפשר לשנות את Production
Branch. זה סותר את ADR-2 ואת ה-DoD של Milestone 1.

**החלטה:** את פרויקט Vercel יוצרים ומחברים ל-GitHub בדרך שאינה מבצעת
Deployment (Vercel CLI: `link` ואז `git connect`, שהמשתמש מריץ בעצמו), ורק
אחר כך משנים את Production Branch ל-`production` ומגדירים משתני Preview.
גרסת ה-Preview הראשונה נוצרת מ-Push רגיל ל-`main`. אם בזמן החיבור יתברר
שמסך הייבוא כבר מאפשר לבחור Production Branch לפני ה-Deploy — משתמשים בו.

**השלכות:** אין צורך בקוד או בהגדרה מיוחדת ב-Repository כדי לחסום
Production. עד Milestone 9 לא קיים אף Production Deployment.

### ADR-5: ענף `production` נוצר כבר ב-Milestone 1

**הקשר:** Vercel לא מאפשר לשמור Production Branch שאינו קיים ב-Repository,
ולכן אי אפשר היה להגדיר את `production` כ-Production Branch כל עוד הענף
לא קיים (בניגוד לכוונה המקורית ב-7.3 ליצור אותו רק באבן הדרך האחרונה).

**החלטה:** הענף `production` נוצר ב-Milestone 1 מאותו commit של `main`,
ונשאר ללא שימוש. אין דוחפים אליו עד Milestone 9. שם, לאחר הרצת
ה-Migrations על `budgi-prod` ובאישור מפורש, מעדכנים אותו לגרסה של `main`.

**השלכות:** עקרון ADR-2 נשמר: דחיפה ל-`main` יוצרת Preview בלבד.
יצירת הענף לא יצרה Deployment (נבדק). עד Milestone 9 אין משתני Production
ב-Vercel, ולכן גם דחיפה בטעות ל-`production` לא תתחבר ל-`budgi-dev`.

### ADR-6: יעד ריק כ-`NULL`, העתקה לחודש חדש ב-SQL, ו-Migrations דרך Supabase MCP

**הקשר:** בהגדרות, שדה יעד ריק פירושו „אין יעד בחודש הזה”. אם שדה כזה היה מוחק את השורה, חודש שבו המשתמש ריקן את כל היעדים היה נראה „לא מוגדר”, והעתקה לחודש חדש (PRD 4.2) הייתה ממלאת אותו שוב מהחודש הקודם. בנוסף, המשתמש אינו מריץ את Supabase CLI, והחלת Migrations על `budgi-dev` צריכה דרך שאינה דורשת ממנו סיסמת DB. בגרסה הנוכחית של Supabase, ה-Data API חושף רק סכמות, טבלאות ופונקציות שנבחרו במפורש בהגדרות הפרויקט.

**החלטה:**
- `business_goals.target_value` מאפשר `NULL`. שמירת יעדים כותבת תמיד את ארבע השורות של החודש, ושדה ריק נשמר כ-`NULL`.
- ההעתקה לחודש חדש ממומשת בפונקציית SQL `ensure_month_defaults(month)` (security invoker, לפי `auth.uid()`), שמעתיקה את התקציב הכולל ואת כל שורות היעדים מהחודש האחרון שלפני החודש המבוקש, רק אם לחודש המבוקש אין אותם. השרת קורא לה לפני כל קריאה של תקציב או יעדים לחודש. ההגדרה הראשונית נשמרת בפונקציה `complete_onboarding` בטרנזקציה אחת.
- Migrations מוחלות על `budgi-dev` דרך כלי ה-Supabase MCP (`apply_migration`), ושם קובץ ה-Migration ב-`supabase/migrations/` מיושר לגרסה שנרשמה בפרויקט. ב-Milestone 9 אותם קבצים יוחלו על `budgi-prod` לפי הנוהל ב-7.5.
- ב-Data API של כל פרויקט חושפים את הסכמה `public`, את הטבלאות העסקיות ואת הפונקציות שהאפליקציה קוראת בלבד (לא פונקציות Trigger). חשיפת פונקציה בהגדרות נותנת הרשאת הרצה גם ל-`anon`, ולכן Migration מבטל אותה.

**השלכות:** „אין יעד” ו„לא הוגדר” מובחנים במסד הנתונים. ההעתקה אטומית ואינה דורסת חודש מוגדר. העתקת תקציבי קמפיינים (Milestone 3) תתווסף לאותה פונקציה. הגדרות החשיפה של ה-Data API אינן עוברות ב-Migrations (כמו 7.6), ויש להגדיר אותן גם ב-`budgi-prod`.

### ADR-7: תקציב קמפיין ריק כ-`NULL`, Foreign Key מורכב, וחלק בסיסי של Metrics Service ב-Milestone 3

**הקשר:** תקציבי קמפיינים מועתקים לחודש חדש (PRD 4.2), ולכן תקציב שהמשתמש מחק היה „חוזר” בהעתקה — אותה בעיה שנפתרה ביעדים ב-ADR-6. בנוסף, צריך להבטיח ששורת שבוע או תקציב תמיד שייכים לבעל הקמפיין. ומסכי הקמפיינים ופרטי הקמפיין (DESIGN 1.4, 1.5) מציגים כבר הוצאה חודשית, ROAS, CPL, Cost per Deal ו-CAC, לפני ש-Metrics Service המלא נבנה ב-Milestone 5.

**החלטה:**
- `campaign_budgets.planned_amount` מאפשר `NULL` = „אין תקציב לקמפיין בחודש הזה”. שמירת תקציב תמיד כותבת שורה לחודש.
- `ensure_month_defaults(month)` מעתיקה גם, לכל קמפיין בסטטוס `active` שאין לו שורה לחודש המבוקש, את השורה שלו מהחודש האחרון שלפניו.
- ל-`campaigns` יש `unique (id, user_id)`, ו-`campaign_budgets` ו-`campaign_performance` מפנים אליו ב-Foreign Key מורכב `(campaign_id, user_id)` (`cascade` לתקציבים, `restrict` לשבועות). נבדק ב-`budgi-dev` שמחיקת משתמש (Cascade) עובדת גם עם `restrict`.
- הפונקציות הטהורות של חלוקת שבוע לחודשים, סכום חודשי, יחסים (רק משורות שבהן הוזנו גם המונה וגם המכנה) ושינוי באחוזים נבנו ב-`src/server/services/metrics.ts`. ב-Milestone 5 השירות מורחב, לא נכתב מחדש.
- פעולות שמירה ב-Server Actions קוראות `refresh()` של Next.js, כך שהמסך המעודכן מגיע יחד עם תוצאת הפעולה.

**השלכות:** „אין תקציב” ו„לא הוגדר” מובחנים. משתמש לא יכול לשייך נתונים לקמפיין של משתמש אחר גם אם ניחש מזהה. מסכי Milestone 5 ישתמשו באותן פונקציות חישוב.

### ADR-8: ייבוא בלי שמירת קובץ, שמירה בפונקציית SQL אחת, ו-SheetJS מהמקור הרשמי

**הקשר:** הייבוא (PRD 3.4, ARCHITECTURE 5.2) דורש תצוגה מקדימה לפני שמירה, שמירה בטרנזקציה אחת, ואי-שמירה של קובץ המקור. ה-Supabase client אינו תומך בטרנזקציות. חבילת `xlsx` שב-npm תקועה בגרסה 0.18.5 עם פרצות אבטחה ידועות. Server Actions מוגבלים כברירת מחדל ל-1MB, ו-Vercel מגביל גוף בקשה לפונקציה ל-4.5MB. קובצי CSV מ-Excel בעברית נשמרים לרוב ב-Windows-1255.

**החלטה:**
- שלושה Route Handlers: `/api/imports/preview`, `/api/imports/commit`, `/api/imports/template`. הדפדפן מחזיק את הקובץ ושולח אותו שוב בכל שלב; ה-commit מפענח ומאמת הכול מחדש בשרת ואינו סומך על שורות מהדפדפן. ההתאמה היא לפי מיקום עמודה.
- השמירה היא פונקציית SQL `commit_import` (security invoker): יוצרת קמפיינים חסרים, מבצעת Upsert עם `coalesce` (שדה ריק לא דורס) ו-`source = 'import'`, ורושמת `import_jobs` — הכול או כלום. ייבוא שנכשל נרשם בנפרד בסטטוס `failed`.
- SheetJS מותקן מהמקור הרשמי (`cdn.sheetjs.com`, גרסה 0.20.3), רק הגיליון הראשון, בלי נוסחאות. CSV נקרא עם `papaparse` כטקסט; קידוד UTF-8, ואם אינו תקין — Windows-1255.
- `parseNumber` המשותף משמש גם את הטפסים וגם את הייבוא. בתאי מספר של Excel סכומים מעוגלים לאגורות; תא תאריך של Excel (מספר סידורי) מומר לתאריך.
- שתי שורות לאותו קמפיין ושבוע באותו קובץ — כל השורות המעורבות נדחות.
- ההתאמה הידנית (`ColumnMapping`) מאפשרת פלטפורמה אחת לכל הקובץ במקום עמודה, ותקופה (`period`: מתאריך–עד תאריך, עד 8 ימים) במקום עמודת שבוע. השבוע נקבע לפי רוב ימי התקופה (`periodWeek`).
- ייבוא לקמפיין אחד עובר באותם Route Handlers עם שדה `campaign` (מזהה הקמפיין). השרת מוודא שהקמפיין שייך למשתמש, מסכם את כל שורות הקובץ לשבוע אחד (`sumRows`), ושומר דרך אותה `commit_import` עם שורה אחת — בלי שינוי במסד הנתונים. שורה שגויה חוסמת את השמירה, כדי שהסיכום לא יהיה חלקי.

**השלכות:** אין צורך ב-Storage או במצב שמור בשרת בין השלבים. ב-Preview/Production קובץ בין 4.5MB ל-5MB נחסם על ידי Vercel (`413`) ומוצגת אותה הודעה „הקובץ גדול מדי”; קובץ תקין של 5,000 שורות שוקל בסביבות 0.5MB. עדכון SheetJS נעשה ידנית מאותו מקור. ב-M7 תתווסף הפעלת Alert Service אחרי `commit_import`. `import_jobs` אינה ניתנת למחיקה מהממשק (רק ב-Cascade עם המשתמש).

### ADR-9: תקציב בתצוגת חודש בלבד, תקופה ב-URL, וערך שבועי מלא בגרפים

**הקשר:** תקציבים מוגדרים לפי חודש (PRD 4.2), אבל במסכי הבית והתקציב אפשר לבחור גם שבוע. אין „תקציב שבועי”, ולכן אין משמעות ברורה ליתרת תקציב לשבוע. בנוסף, מסכי Milestone 5 צריכים בורר תקופה ששומר על המצב בין טעינות, וגרפים שבועיים שבהם שבוע יכול לחצות חודשים.

**החלטה:**
- לפי החלטת בעל המוצר: במסך הבית, בתצוגת שבוע, כרטיס „יתרת תקציב” מציג „לא זמין בתצוגת שבוע”. במסך התקציב יש בורר חודש בלבד (מהחודש הראשון ועד החודש הבא). PRD 4.2 לא עודכן, לבקשת בעל המוצר.
- התקופה נשמרת ב-URL (`?period=month&value=YYYY-MM` / `?period=week&value=YYYY-MM-DD`, ובמסך התקציב `?month=YYYY-MM-01&tab=campaigns`), כך שהמסך מחושב בשרת. ערך לא תקין או עתידי → החודש הנוכחי.
- ב-Metrics Service כל מדד יחס מחזיר ערך או סיבה בעברית לכך שאינו זמין (`Metric`), כדי שהממשק יסביר מה חסר (PRD 4.4, 4.8).
- בגרפים כל נקודה היא הסכום של השבוע כולו על פני כל הקמפיינים (בלי חלוקה בין חודשים), ושבוע בלי ערך הוא רווח. הסיכומים החודשיים בכרטיסים כן מחולקים לפי ימים (ADR-1).
- טבלת תקציבי הקמפיינים מציגה קמפיינים פעילים, וכל קמפיין אחר שיש לו תקציב או הוצאה באותו חודש. שינוי באחוזים של יתרת התקציב מוצג רק כששתי היתרות חיוביות.
- הגרפים ב-Recharts מוצגים ב-LTR (הזמן משמאל לימין) בתוך עמוד RTL, עם טבלה נסתרת לקוראי מסך.
- במסך המדדים תקופת ההשוואה נבחרת ב-`?compare=YYYY-MM` / `?compare=YYYY-MM-DD` (מאותו סוג כמו התקופה; PRD 4.4, DESIGN 1.7). ברירת המחדל היא התקופה הקודמת, והיא אינה נכתבת ב-URL; שינוי התקופה מחזיר אליה. תקופת השוואה שאינה הקודמת נשלפת בשאילתה נפרדת.

**השלכות:** אין שינוי במסד הנתונים. המסכים ניתנים לשיתוף ולרענון בלי לאבד את התקופה. התחזית (M6) וההתראות (M7) ישתמשו באותן פונקציות (`periodSummary`, `goalProgress`, `budgetGap`).

### ADR-10: תחזית — חודש מלא, תחזית לפי שדה, תחזית שאינה יורדת מתחת לבפועל, וקו מקווקו לפי קצב יומי

**הקשר:** PRD 4.5 משקלל היסטוריה רק כשיש „נתונים מלאים לפחות לשני חודשים קודמים”, בלי להגדיר מהו חודש מלא. בנוסף, שילוב 70/30 עם חודשים קודמים חלשים יכול לתת תחזית נמוכה ממה שכבר הוצא או הוכנס, והגרף (DESIGN 1.8) צריך ערך לשבועות הצפויים.

**החלטה:**
- לפי החלטת המשתמש: חודש קודם נחשב **מלא** רק אם לכל שבוע שיש לו ימים בחודש יש לפחות שורת ביצועים אחת (של קמפיין כלשהו). נבדקים שלושת החודשים הקלנדריים שלפני החודש; עם שניים מלאים לפחות — `history_avg` הוא ממוצע הסכום החודשי שלהם.
- התחזית מחושבת **לכל שדה בנפרד** (הוצאות, הכנסות, לידים, עסקאות): שדה שלא הוזן בחודש → אין תחזית, עם סיבה; בממוצע ההיסטוריה נספרים רק חודשים מלאים שהשדה הוזן בהם. לכל תחזית `basis` משלה; השורה במסך מציגה את ה-`basis` של ההכנסות (או ההוצאות), וכרטיס עם `basis` אחר מציג הערה.
- לפי אישור המשתמש: `forecast = max(forecast, actual)` — התחזית אינה יורדת מתחת למה שכבר קרה. PRD לא עודכן.
- ROAS צפוי = הכנסות צפויות ÷ הוצאות צפויות; `pace_and_history` רק אם שתיהן כאלה.
- בגרף: שבועות שאחרי השבוע האחרון עם נתונים מקבלים `(forecast − actual) ÷ (ימים בחודש − ימים מכוסים) × 7` — ערך של שבוע שלם, כמו הנקודות בפועל (ADR-9). הקו המקווקו מתחיל בנקודה האחרונה בפועל.
- המסך `/forecast?month=YYYY-MM-01` (כמו מסך התקציב), מהחודש הראשון ועד החודש הנוכחי. החודש הנוכחי → תחזית; חודש שעבר → בפועל בלבד. הפונקציות הטהורות ב-`src/server/services/forecast.ts`, הטעינה ב-`getForecastData` (`dashboard.ts`), בשאילתה אחת לחודש ולשלושת הקודמים.

**השלכות:** אין שינוי במסד הנתונים. חודש עם שבוע אחד חסר אינו משפיע על התחזית. ה-Advisor (M8) וההתראות (M7) יכולים להשתמש ב-`monthForecast`.

### ADR-11: התראות — החלטות המשתמש על חזרה, מפתח לפי יעד, תחזית לקמפיין, וכשל שאינו מכשיל שמירה

**הקשר:** PRD 4.6 ו-ARCHITECTURE 5.5 מגדירים את התנאים ואת מניעת הכפילויות, אבל לא מכסים כמה מקרים: סף 0 (ברירת המחדל של „חריגה מהתקציב”) הופך את כלל „גדלה בגודל הסף” לחזרה בכל שמירה; „יעד הושג” היה חוזר כל שבוע; ROAS מינימלי הוא רף ולא יעד לצבור; ו„ירידה בביצועים” על שבוע ישן של קמפיין שהופסק אינה רלוונטית. בנוסף, יש כמה יעדים לעסק, ולכן `alert_type + entity + month` אינו מבחין ביניהם.

**החלטה:**
- לפי החלטות המשתמש: (1) בתוך אותו שבוע קלנדרי התראה חוזרת רק אם הסטייה גדלה לפחות בגודל הסף, וכשהסף 0 — לפחות 10 נקודות אחוז (כך גם ב-ROAS מינימלי, שאין לו סף). (2) „יעד הושג” — פעם אחת בחודש לכל יעד. (3) אין „יעד הושג” ל-ROAS מינימלי; עליו נשלחת רק „יעד בסיכון” כשה-ROAS הצפוי נמוך מהמינימום. (4) „ירידה בביצועים” נבדקת רק אם השבוע האחרון שהוזן לקמפיין הוא השבוע הנוכחי או אחד משני השבועות שלפניו. PRD לא עודכן.
- `dedupe_key = alert_type:entity:month`, וביעדים מצטרף סוג היעד (`goal_risk:business:revenue:2026-11-01`). השבוע הקלנדרי נקבע לפי `created_at` בשעון ישראל.
- קצב הוצאות לקמפיין = `monthForecast` על השורות של הקמפיין בלבד (כולל סף 7 הימים וההיסטוריה שלו). CPL ממוצע של השבועות הקודמים = סך ההוצאה ÷ סך הלידים בשבועות שיש בהם הוצאה ולידים > 0.
- הבדיקה רצה בקוד (`src/server/services/alerts.ts` — פונקציות טהורות; `alerts-check.ts` — טעינה ושמירה) אחרי שמירת שבוע, מחיקת שבוע, שמירת תקציב (כולל ולתקציב קמפיין), שמירת יעדים, ושני מסלולי ה-commit של הייבוא. יצירת קמפיין אינה מפעילה בדיקה — לקמפיין חדש אין נתונים, ולכן אף תנאי אינו יכול להתקיים. שינוי הגדרות ההתראות אינו מפעיל בדיקה.
- כשל בבדיקת ההתראות נרשם ללוג ואינו מכשיל את השמירה; השמירה מחזירה `alerts` (ריק) ב-`FormResult` או בתשובת ה-commit, וה-Frontend מציג Toast לכל התראה.
- הכותרת והתיאור נשמרים בהתראה ברגע היצירה; מספרים, סכומים ותאריכים בתוך הטקסט עטופים ב-Unicode isolates (LRI…PDI) כדי שלא יתהפכו ב-RTL. שם הקמפיין אינו חלק מהטקסט — הוא נשלף לפי `related_campaign_id` (`on delete cascade`).
- `alert_settings`: שורה חסרה = ברירת המחדל בקוד; `threshold_config` נשמר כ-`{percent}` (וב„ירידה בביצועים” גם `weeks`, 2–12), נבדק ב-Zod בשמירה ובקריאה. `alerts`: למשתמש הרשאת עדכון לעמודה `read_at` בלבד, ומדיניות מחיקה לבעלים שאינה מוצעת בממשק (משמשת את ניקוי הבדיקות).

**השלכות:** Migration `20261103175254_alerts.sql` הוחל על `budgi-dev`; שתי הטבלאות נחשפו ב-Data API אוטומטית. ב-Milestone 9 יש להחיל אותו גם על `budgi-prod`. ה-Advisor (M8) יכול להשתמש ב-`evaluateAlerts` כדי להסביר חריגות.

### ADR-12: AI Advisor — ספירה אחרי הצלחה בלי אפשרות איפוס, בדיקות לוגיות שמסירות המלצה, מודל חסכוני, ובדיקות בלי OpenAI

**הקשר:** PRD 4.7 ו-ARCHITECTURE 5.6, 6.4 מגדירים מגבלה של 20 שאלות ביום, ששאלה שנכשלה אינה נספרת, ושכל סכום/אחוז בהמלצה עובר בדיקה בשרת — אבל לא מגדירים מתי בדיוק נספרת שאלה, מה קורה להמלצה שנכשלה בבדיקה, באיזה מודל משתמשים ואיך בודקים בלי עלות. בנוסף, אם למשתמש הייתה הרשאת כתיבה לטבלת המונה, הוא היה יכול לאפס אותה דרך ה-Data API ולעקוף את מגבלת העלות.

**החלטה:**
- `advisor_usage` (מפתח `(user_id, usage_date)`, מונה 0–20): למשתמש הרשאת **קריאה בלבד**. הכתיבה רק דרך `advisor_record_question()` — `security definer`, `search_path` ריק, לפי `auth.uid()`, מעלה ב-1 ולא מעבר ל-20, ו„היום” לפי `Asia/Jerusalem`. `execute` ל-`authenticated` בלבד. ה-Advisor של Supabase מתריע על פונקציית `security definer` שמשתמש מחובר יכול להריץ — זה מכוון: היא רק מוסיפה שאלה למונה של המשתמש עצמו.
- השרת בודק את המונה **לפני** הפנייה ל-OpenAI (20 → תשובת 429 בלי פנייה), ומעלה אותו רק **אחרי** תשובה שעברה Zod. שתי בקשות במקביל יכולות לחרוג בשאלה אחת לכל היותר; הקלט מושבת בזמן המתנה, ולכן זה נדיר.
- התשובה נדרשת ב-Structured Outputs (strict) לפי סכמת Zod אחת (`src/lib/advisor/schema.ts`, דרך `zodTextFormat` של חבילת `openai`); שדות אופציונליים הם `nullable`. ב-`reallocate` הסדר של `campaign_ids` הוא [מקור, יעד].
- המלצה שלא עוברת את הבדיקות הלוגיות (קמפיין שאינו בהקשר, בלי סכום ובלי אחוז, סכום מעל תקציב קמפיין המקור — או ההוצאה שלו כשאין תקציב — או מעל התקציב הכולל בהגדלה, אחוז מעל 100 בהקטנה/העברה או מעל 200 בהגדלה) **מוסרת**, ונוספת הסתייגות כללית אחת. סכומים מעוגלים לשקל ואחוזים לספרה אחת. שמות הקמפיינים בכרטיס נלקחים מהנתונים לפי המזהה, לא מטקסט המודל.
- ההקשר נבנה מחדש בכל שאלה (`src/server/services/advisor-context.ts`) מהפונקציות הקיימות (`periodSummary`, `monthForecast`, `budgetGap`, `goalProgress`): החודש הנוכחי והקודם, תחזית, תקציבים, יעדים, קמפיינים פעילים או עם תקציב/נתונים, ועד 10 התראות מהחודש. בלי שורות שבועיות גולמיות, בלי תיאורי קמפיינים, ובלי שם, אימייל, שם עסק או מזהה משתמש. ההקשר נשלח כהודעת `developer` נפרדת שמסומנת כנתונים.
- מודל: `gpt-6-luna` (קבוע `ADVISOR_MODEL` ב-`src/server/ai/openai.ts`) — המודל החסכוני ש-OpenAI ממליצה עליו לשימוש בנפח גבוה, עם Structured Outputs. `max_output_tokens` 1,500, timeout של 45 שניות בלי ניסיון חוזר אוטומטי (ניסיון חוזר עלול לעבור את מגבלת 60 השניות של ה-Route; המשתמש לוחץ „נסה שוב”), `store: false`, ו-`maxDuration` של 60 שניות ל-Route.
- בדיקות: Unit עם Mock ל-OpenAI ולמסד הנתונים; Integration לפונקציית המונה ול-RLS עם משתמש בדיקה B (הבדיקה עוברת גם בהרצה חוזרת באותו יום, כי אי אפשר לאפס); Playwright מחליף את `/api/advisor` בתשובות קבועות (`page.route`), כך שהבדיקות לא פונות ל-OpenAI ולא צורכות את המכסה של משתמש A. אין בקוד האפליקציה מצב Mock.

**השלכות:** Migration `20261103184903_advisor_usage.sql` הוחל על `budgi-dev`; ב-Milestone 9 יש להחיל אותו גם על `budgi-prod` ולחשוף בו את הטבלה ואת הפונקציה ב-Data API. החלפת מודל היא שינוי של קבוע אחד. משתמש בדיקה B מגיע ל-20 שאלות בכל יום שבו רצות בדיקות ה-Integration, ולכן אין להשתמש בו לבדיקה ידנית של ה-Advisor באותו יום.

### ADR-13: תובנות שמורות של ה-Advisor — עותק של התשובה, בבחירת המשתמש

**הקשר:** לבקשת בעל המוצר, אחרי בניית ה-Advisor, נוספה האפשרות לשמור תובנות חשובות מהשיחה (PRD 4.7 ו-DESIGN 1.12 עודכנו). השיחה עצמה עדיין אינה נשמרת. צריך להחליט מה נשמר, מי מחליט, ואם תובנה מתעדכנת כשהנתונים משתנים.

**החלטה:**
- לפי החלטת המשתמש: כפתור „שמור תובנה” בכל תשובה, ורשימת „תובנות שמורות” מתקפלת במסך ה-Advisor (לא מסך נפרד). רק מה שהמשתמש בחר נשמר; אין סיכום אוטומטי של ה-AI, ושמירה אינה נספרת במגבלת 20 השאלות.
- טבלה `advisor_insights` (`id`, `user_id`, `question`, `reply` JSONB, `created_at`). `reply` הוא עותק של התשובה כפי שהוצגה (הסבר, המלצות עם שמות הקמפיינים, הסתייגויות, בקשת נתונים חסרים), ונבדק באותה סכמת Zod (`advisorReplySchema`) בשמירה ובקריאה; שורה שאינה עוברת את הסכמה מדולגת בתצוגה. תובנה אינה מתעדכנת כשהנתונים משתנים — היא מציגה את תאריך השמירה.
- גם תשובה חדשה מה-AI חייבת לעבור את `advisorReplySchema` (למשל עד 10 המלצות), כדי שכל תשובה שמוצגת תהיה ניתנת לשמירה.
- RLS: קריאה, הוספה ומחיקה לבעלים בלבד; אין עדכון. אילוצים: שאלה 1–1,000 תווים, `reply` אובייקט עד 32KB. מחיקה ב-Cascade עם החשבון.
- השמירה והמחיקה הן Server Actions (`src/features/advisor/actions.ts`); הרשימה נטענת בשרת עם המסך.

**השלכות:** Migration `20261104075803_advisor_insights.sql` הוחל על `budgi-dev`; ב-Milestone 9 יש להחיל אותו גם על `budgi-prod` ולחשוף את הטבלה ב-Data API. שמות קמפיינים בתובנה ישנה נשארים כפי שהיו גם אם הקמפיין שונה או נמחק.

### ADR-14: הקשחת אבטחה אחרי סקירה — שאלה אחת בכל רגע, כותרות אבטחה, מגבלות אורך במסד הנתונים וספריות פיתוח

**הקשר:** סקירת אבטחה של כל המערכת (אחרי Milestone 8) לא מצאה פרצה חמורה: RLS בכל הטבלאות, אין Secrets ב-Git או בדפדפן, כל פעולה בודקת Session וקלט. נמצאו ארבעה פערים: (1) בקשות במקביל ל-`/api/advisor` עברו כולן את בדיקת המגבלה היומית לפני שהמונה עלה, ולכן אפשר היה לגרום להרבה קריאות ל-OpenAI (עלות); (2) אין כותרות אבטחה, והאתר יכול להיות מוצג בתוך מסגרת של אתר אחר (Clickjacking); (3) מגבלות האורך של שם ותיאור קמפיין קיימות רק בטפסים, ובקשה שעוקפת את האפליקציה יכלה לשמור טקסט ענק שנשלח ל-AI; (4) `npm audit` מצא 6 פגיעויות (נמוכות–בינוניות) — כולן דרך חבילת `shadcn`, כלי CLI שלא רץ בזמן ריצה.

**החלטה:**
- **נעילה לשאלה אחת:** טבלה `advisor_locks` (בלי הרשאות ישירות) ושתי פונקציות `security definer`: `advisor_acquire_lock()` לוקחת נעילה ל-70 שניות (יותר ממגבלת 60 השניות של ה-Route) ומחזירה Token אקראי, או `null` אם יש שאלה אחרת בטיפול; `advisor_release_lock(token)` משחררת רק עם ה-Token שלקח אותה. ה-Token נוצר ונשמר בשרת ולא נשלח לדפדפן, ולכן המשתמש אינו יכול לשחרר נעילה של השרת. בדיקת המגבלה היומית רצה בזמן שהנעילה מוחזקת. שאלה במקביל מקבלת 409 עם הודעה בעברית; הנעילה משתחררת גם בכשל.
- **כותרות אבטחה** לכל התשובות (`next.config.ts`): `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` שחוסם מצלמה, מיקרופון, מיקום ותשלום; וללא `X-Powered-By`. CSP מלא (scripts) לא נוסף ב-MVP — הוא דורש nonce לכל הסקריפטים של Next.js.
- **מגבלות במסד הנתונים** (Migration `length_limits`): שם קמפיין עד 100 תווים, תיאור עד 500, `threshold_config` עד 1,000 בתים, `error_summary` עד 100 שגיאות ו-100KB. ל-AI נשלחים לכל היותר 50 קמפיינים (לפי הוצאה החודש, תקציב והוצאה בחודש הקודם), עם `campaigns_not_included`.
- **`shadcn` הועבר ל-`devDependencies`:** משמש רק בבנייה (קובץ CSS). `npm audit --omit=dev` נקי.

**השלכות:** Migrations `20261104131224_advisor_lock.sql` ו-`20261104131359_length_limits.sql` הוחלו על `budgi-dev`; ב-Milestone 9 יש להחיל אותם גם על `budgi-prod`. אין שינוי בהתנהגות למשתמש רגיל (הקלט ממילא מושבת בזמן המתנה). הגנת „סיסמאות שדלפו” ב-Supabase כבויה ב-`budgi-dev` בלבד (משתמשי בדיקה); ב-Production אין Email/Password.

### ADR-15: מחיקת חשבון, Session של חשבון שנמחק, בדיקות על משתמש זמני, ונגישות

**הקשר:** ARCHITECTURE 6.5 מגדיר `DELETE /api/account` עם Service Role Key, אבל לא מה קורה ב-Session פתוח במכשיר אחר אחרי המחיקה, ואיך בודקים מחיקה בלי למחוק את משתמשי הבדיקה הקבועים (ADR-3). בנוסף, בדיקת axe ובדיקות הרוחב (Milestone 9) מצאו ממצאים שדרשו החלטות עיצוביות קטנות.

**החלטה:**
- `DELETE /api/account` מאמת Session, דורש בגוף הבקשה `{ confirm: "מחק" }` (גם בשרת), מוחק את המשתמש ב-`auth.admin.deleteUser` (כל הטבלאות נמחקות ב-Cascade) ואז מנקה את ה-Cookies (`signOut` מקומי; כשל בו אינו מכשיל את המחיקה). ה-Service Role Key נקרא רק ב-`src/lib/supabase/admin.ts` (`server-only`), ו-`npm run check:secrets` מוודא זאת.
- **Session של חשבון שנמחק** (למשל במכשיר אחר, שה-Token שלו עדיין בתוקף): ל-Data Access Layer משתמש בלי שורת `profiles` אינו מחובר, והוא מופנה ל-`/auth/signout`, שמנקה את ה-Cookies ומעביר ל-`/login`. בלי זה ה-Proxy היה מחזיר אותו מ-`/login` לאפליקציה בלולאה.
- **בדיקות המחיקה** (Integration ו-Playwright) יוצרות משתמש זמני ב-`budgi-dev` דרך ה-Admin API, ממלאות לו שורה בכל טבלה, ומוחקות אותו. משתמשי הבדיקה A ו-B לעולם אינם נמחקים. לכן `SUPABASE_SERVICE_ROLE_KEY` של `budgi-dev` נמצא גם ב-`.env` המקומי וגם במשתני ה-Preview ב-Vercel.
- **נגישות:** axe (`@axe-core/playwright`, WCAG 2.0 A/AA) רץ על כל המסכים, במצב ריק ועם נתונים, ובחלונות פתוחים, ב-Desktop, Tablet (768px) ו-Mobile. נוסף קישור „דילוג לתוכן הראשי”. תגיות סטטוס (קמפיין, חומרת התראה) הן טקסט בצבע הסטטוס על רקע לבן עם גבול בגוון הסטטוס, כי על רקע בגוון הסטטוס הניגודיות יורדת מ-4.5:1. טקסט משני על רקע סגול בהיר או אפור (`bg-accent`, `bg-muted`) הוא `brand-dark` ב-80% ולא Gray. טבלאות הגרפים לקוראי מסך עטופות ב-`div` עם `sr-only`, כי טבלה מתעלמת מרוחב 1px והרחיבה את העמוד במובייל.
- **מצבי שגיאה** (DESIGN 1.14): `error.tsx` בתוך ה-Shell („נסה שוב”), `global-error.tsx`, ו-`not-found.tsx` בעברית (גם בתוך ה-Shell, למשל לקמפיין שאינו קיים או של משתמש אחר).
- **הקמת `budgi-prod`:** כל ה-Migrations הוחלו דרך Supabase MCP, בשמות של קובצי ה-Repository (הגרסאות ב-`budgi-prod` שונות). ב-`budgi-prod` ה-Data API נוצר כבוי, ואחרי הפעלתו סימון הטבלאות והפונקציות במסך „Exposed tables/functions” נתן ל-`anon` ול-`authenticated` הרשאות מלאות לכל הטבלאות והפונקציות, ודרס את ההרשאות המצומצמות (למשל כתיבה ל-`advisor_usage`, שהייתה מאפשרת לאפס את מגבלת ה-AI). Migration `20261104151930_restore_grants_after_data_api.sql` מחזיר את ההרשאות בדיוק כפי שהן ב-Migrations הקודמים; הוא הוחל על שני הפרויקטים (ב-`budgi-dev` לא שינה דבר), ואחריו ההרשאות בשני הפרויקטים זהות (נבדק בהשוואה). **כל שינוי עתידי במסך החשיפה של ה-Data API מחייב להריץ את ה-Migration הזה שוב ולהשוות הרשאות.**
- **דפים משפטיים:** לבקשת בעל המוצר נכתבה טיוטה של תנאי שימוש ומדיניות פרטיות, לפי מה שהאפליקציה באמת שומרת ושולחת (6.4, 6.5). מומלץ שעורך דין יעבור עליה לפני השקה רחבה.

**השלכות:** אין Migration חדש. מחיקה ופתיחה מחדש של חשבון מאפסות גם את מונה השאלות היומי של ה-AI (המונה נמחק עם החשבון).

### ADR-16: ייבוא של חודש מלא — חלוקה לשבועות לפי ימים

**הקשר:** לבקשת בעל המוצר (במהלך Milestone 9), אפשר לייבא גם קובץ עם נתונים של חודש שלם, ולא רק של שבוע (ADR-8 הגביל את התאריכים לעד 8 ימים). הנתונים נשמרים לפי שבוע (ADR-1), והסיכום החודשי מחושב מהשבועות לפי מספר הימים של כל שבוע בחודש.

**החלטה:**
- בבחירת תאריכים לכל הקובץ אפשר לבחור עד 8 ימים (כמו קודם), או חודש קלנדרי מלא — מה-1 ועד היום האחרון שלו. טווח ארוך אחר נדחה עם הסבר.
- לפי החלטת בעל המוצר: הסכומים מתחלקים בין כל השבועות שיש להם ימים בחודש, לפי הקצב היומי של החודש. כל שורת שבוע מחזיקה שבוע שלם בקצב הזה — גם שבוע שמשותף לחודש הסמוך — כך שהסיכום החודשי שמחושב מהשבועות (ADR-1) שווה לסכום בקובץ. סכומי כסף מעוגלים לאגורות; מספרים שלמים (לידים, עסקאות, לקוחות) מחולקים בשיטת השארית הגדולה, כך שהם מסתכמים לסה״כ של הקובץ (בהפרש של פחות משלם בשבועות המשותפים).
- המימוש ב-`splitMonth` (`src/lib/imports/fields.ts`), גם בייבוא הכללי (כל שורה בקובץ הופכת לשורת שבוע לכל שבוע בחודש) וגם בייבוא לקמפיין אחד. השמירה דרך אותה `commit_import`, בלי שינוי במסד הנתונים.
- המסכים מסבירים שזו חלוקה לפי ימים ושהיא הערכה: בהתאמת העמודות („אוקטובר 2026, מחולק ל-5 שבועות”), בבדיקה לפני הייבוא ובסיום.

**השלכות:** הגרף השבועי של חודש מיובא נראה כקו אחיד. שבוע שמשותף לשני חודשים נשמר פעם אחת: ייבוא החודש הסמוך מחליף אותו בקצב של החודש הסמוך, ולכן הסיכום של הימים המשותפים בחודש הקודם משתנה מעט. התחזית וההתראות מחושבות מהשבועות כרגיל.

### ADR-17: זיהוי אוטומטי של עמודות נפוצות בייבוא

**הקשר:** לבקשת בעל המוצר, פחות התעסקות בהתאמת עמודות. עד עכשיו זוהו אוטומטית רק הכותרות של קובץ הדוגמה, ובקובץ שיוצא מפלטפורמת פרסום היה צריך לבחור כל עמודה ידנית.

**החלטה:** `suggestMapping` מזהה גם שמות נפוצים בייצוא מפלטפורמות ובגיליונות, באנגלית ובעברית (למשל `Campaign`, `Ad name`, `Amount spent (ILS)`, `Spend_ILS`, `Leads`, `New_Customers`, `Revenue_ILS`, `Reporting starts`), אחרי ניקוי של סימני מטבע, קווים תחתונים ואותיות גדולות. כל עמודה משמשת שדה אחד. עמודת „תאריך” יומית אינה מזוהה כשבוע (שורות של כמה ימים היו נראות ככפולות), ושדה שאין לו עמודה מתאימה (למשל עסקאות) נשאר „לא לייבא”. כשנמצאו שם קמפיין, פלטפורמה ושבוע — הייבוא מדלג על שלב ההתאמה; אחרת שלב ההתאמה נפתח ממולא, ונשאר בדרך כלל לבחור רק את הפלטפורמה (ואת התאריכים, אם אין עמודת שבוע).

**השלכות:** אין שינוי במסד הנתונים. ההצעה ניתנת לשינוי במסך; שם עמודה לא צפוי פשוט לא מזוהה.
