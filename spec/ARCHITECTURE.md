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

**החלטת סביבות מומלצת:** - בתחילת הפיתוח ניתן להקים שני פרויקטי Supabase
בתוכנית Free, משום שמכסת Free שפורסמה היא שני פרויקטים פעילים. יש להביא
בחשבון שפרויקט Free עם פעילות נמוכה במשך כשבוע עלול להיעצר אוטומטית.
השהיה אינה מחיקת נתונים, אך האפליקציה לא תוכל להשתמש בפרויקט עד
חידושו. - לפני השקת מוצר Production אמיתי, יש להעביר את סביבת Production
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
2.  **Onboarding & Settings** --- הגדרת תקציב כולל, תקציבי קמפיינים,
    יעדי הכנסות ויעדים נוספים, וספי התראות.
3.  **Dashboard** --- KPI cards, גרפי מגמה, טבלת השוואת קמפיינים, קצב
    תקציב ותחזית.
4.  **Campaign Management** --- יצירה, עריכה והצגת קמפיינים ונתוני
    ביצועים.
5.  **Data Import** --- בחירת קובץ, הצגת שגיאות ייבוא ותוצאת העדכון.
6.  **Alert Center** --- התראות קופצות והיסטוריית התראות.
7.  **AI Budget Advisor** --- ממשק שיחה והצגת המלצות מובנות.

#### Backend

1.  **Authentication & Session Layer** --- אימות משתמש ובדיקת Session
    בכל פעולה מוגנת.
2.  **Campaign Service** --- CRUD לקמפיינים ולנתוני ביצועים.
3.  **Budget & Goal Service** --- שמירת תקציב כולל, תקציבי קמפיינים
    ויעדים.
4.  **Import Service** --- פענוח CSV/Excel, ולידציה, התאמת קמפיין ותקופה
    וכתיבה מבוקרת.
5.  **Metrics Service** --- חישוב מדדים מספריים.
6.  **Forecast Service** --- חישוב תחזית חודשית לפי קצב נוכחי ומגמות
    היסטוריות זמינות.
7.  **Alert Service** --- הערכת תנאי התראה לאחר שינוי נתונים ושמירת
    התראות.
8.  **AI Advisor Service** --- בניית הקשר נתונים מצומצם, קריאה ל-OpenAI,
    ולידציה והחזרת תשובה.
9.  **Data Access Layer** --- גישה למסד הנתונים דרך Supabase client
    מאובטח.

### 2.3 מבנה לוגי של הקוד

מומלץ לארגן את הקוד לפי תחומי אחריות ולא לפי סוגי קבצים בלבד:

``` text
src/
  app/
    (auth)/
      login/
    (app)/
      dashboard/
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
```

הדוגמה היא מבנה לוגי מומלץ, לא דרישה למימוש כל תיקייה כיחידה נפרדת. יש
לשמור על כלל: קוד שרת וסודות אינם מיובאים לרכיבי Client.

------------------------------------------------------------------------

## 3. Data Model

### 3.1 עקרונות

-   PostgreSQL הוא מקור האמת היחיד לנתוני העסק.
-   כל רשומה עסקית משויכת ל-`user_id` של בעל החשבון.
-   כל הסכומים נשמרים ב-ILS, באמצעות `numeric` ולא `float`, כדי למנוע
    שגיאות עיגול כספי.
-   נתוני ביצועים נשמרים לפי קמפיין ותקופה, כדי לאפשר השוואות היסטוריות.
-   `created_at` ו-`updated_at` נשמרים ב-UTC; תצוגה וחישובי גבולות
    יום/חודש עסקיים יתבצעו לפי אזור הזמן `Asia/Jerusalem`.
-   ב-MVP אין ישות Business נפרדת עם חברות צוות: משתמש אחד מנהל עסק אחד.

### 3.2 ישויות מרכזיות

  --------------------------------------------------------------------------
  Entity / Table            שדות עיקריים             תפקיד וקשרים
  ------------------------- ------------------------ -----------------------
  `profiles`                `id` (UUID, FK           פרופיל משתמש; מזהה
                            ל-`auth.users`),         המשתמש הוא הבעלים של
                            `display_name`,          נתוני העסק
                            `created_at`             

  `business_settings`       `id`, `user_id`,         הגדרות עסק; `currency`
                            `currency`, `timezone`,  מוגדר `ILS`, אזור זמן
                            `created_at`,            `Asia/Jerusalem`
                            `updated_at`             

  `budgets`                 `id`, `user_id`,         תקציב כולל לתקופה; סכום
                            `period_start`,          ב-ILS
                            `period_end`,            
                            `planned_amount`,        
                            `created_at`,            
                            `updated_at`             

  `campaigns`               `id`, `user_id`, `name`, קמפיין; `platform`
                            `platform`, `status`,    מוגבל ל-Meta Ads,
                            `created_at`,            Google Ads, TikTok Ads
                            `updated_at`             או LinkedIn Ads

  `campaign_budgets`        `id`, `user_id`,         תקציב מתוכנן לקמפיין
                            `campaign_id`,           בתקופה
                            `period_start`,          
                            `period_end`,            
                            `planned_amount`         

  `campaign_performance`    `id`, `user_id`,         מדדי ביצועים לתקופה;
                            `campaign_id`,           `source` מציין manual
                            `period_start`,          או import
                            `period_end`, `spend`,   
                            `leads`, `deals`,        
                            `new_customers`,         
                            `revenue`, `source`,     
                            `created_at`,            
                            `updated_at`             

  `business_goals`          `id`, `user_id`,         יעדי הכנסות ויעדים
                            `period_start`,          נוספים הנתמכים בנתונים,
                            `period_end`,            כגון מספר עסקאות
                            `goal_type`,             
                            `target_value`           

  `alert_settings`          `id`, `user_id`,         ספים והפעלה/כיבוי של
                            `alert_type`,            סוגי התראות
                            `threshold_config`,      
                            `enabled`, `updated_at`  

  `alerts`                  `id`, `user_id`,         התראות שנוצרו ונשמרות
                            `alert_type`,            במרכז ההתראות
                            `severity`, `title`,     
                            `description`,           
                            `related_campaign_id`,   
                            `dedupe_key`,            
                            `created_at`, `read_at`  

  `advisor_conversations`   `id`, `user_id`,         שיחות AI, אם נדרשת
                            `created_at`,            שמירת היסטוריית שיחה
                            `updated_at`             

  `advisor_messages`        `id`, `conversation_id`, הודעות משתמש ותשובות
                            `user_id`, `role`,       Advisor; אין לשמור
                            `content`,               סודות או Tokens
                            `structured_payload`,    
                            `created_at`             

  `import_jobs`             `id`, `user_id`,         תיעוד תהליך ייבוא
                            `file_name`, `status`,   ותוצאותיו; לא מחייב
                            `rows_total`,            שמירת קובץ המקור
                            `rows_imported`,         
                            `rows_rejected`,         
                            `error_summary`,         
                            `created_at`,            
                            `completed_at`           
  --------------------------------------------------------------------------

**הערות תכנון:** - `campaign_performance` יאפשר כמה רשומות לתקופות
שונות. יש להגדיר Unique Constraint מתאים על משתמש, קמפיין וטווח תקופה,
כדי למנוע כפילויות. אם נדרשת תמיכה בפירוט יומי, יש לשמור רשומות לפי יום
ולא לערבב נתונים יומיים עם סיכומים תקופתיים. - בייבוא, התאמת רשומה קיימת
תתבצע לפי קמפיין ותקופה. כאשר לא ניתן לזהות התאמה חד-משמעית, יש לדחות את
השורה או לבקש תיקון במקום לעדכן רשומה שגויה. - `threshold_config` יישמר
כ-JSONB, אך מבנה הערכים יאומת באמצעות Zod בצד השרת. -
`structured_payload` ישמור נתונים מובנים של המלצה, למשל קמפיינים
מעורבים, סכום שינוי, אחוז שינוי, הסבר ורמת ביטחון. טקסט ההמלצה יוצג
בנפרד. - אם אין צורך עסקי בהיסטוריית שיחות, ניתן להשאיר את שמירת השיחות
מחוץ ל-MVP ולהחזיר תשובות ללא היסטוריה מתמשכת. אם נשמרת היסטוריה, יש
לאפשר למשתמש גישה רק לשיחות שלו.

### 3.3 קשרים בין הישויות

``` mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : owns
    AUTH_USERS ||--|| BUSINESS_SETTINGS : configures
    AUTH_USERS ||--o{ BUDGETS : sets
    AUTH_USERS ||--o{ CAMPAIGNS : owns
    CAMPAIGNS ||--o{ CAMPAIGN_BUDGETS : allocated
    CAMPAIGNS ||--o{ CAMPAIGN_PERFORMANCE : records
    AUTH_USERS ||--o{ BUSINESS_GOALS : defines
    AUTH_USERS ||--o{ ALERT_SETTINGS : configures
    AUTH_USERS ||--o{ ALERTS : receives
    CAMPAIGNS o|--o{ ALERTS : relates
    AUTH_USERS ||--o{ ADVISOR_CONVERSATIONS : starts
    ADVISOR_CONVERSATIONS ||--o{ ADVISOR_MESSAGES : contains
    AUTH_USERS ||--o{ IMPORT_JOBS : imports
```

### 3.4 אינדקסים ואילוצים

-   אינדקס על `user_id` בכל טבלה עסקית.
-   אינדקס על `(user_id, period_start, period_end)` בטבלאות תקציב, יעדים
    וביצועים.
-   אינדקס על `(user_id, campaign_id, period_start, period_end)`
    ב-`campaign_performance`.
-   Foreign Keys עם `ON DELETE CASCADE` עבור נתונים השייכים למשתמש,
    בכפוף למדיניות מחיקת החשבון.
-   `CHECK` constraints למניעת ערכים שליליים ב-`spend`, `revenue`,
    `planned_amount`, `leads`, `deals`, `new_customers`.
-   יש לוודא שמספר עסקאות ומספר לקוחות חדשים אינם שליליים; אין להניח
    שמספר לקוחות חדשים חייב להיות שווה למספר העסקאות.
-   יש לוודא `period_end >= period_start`.
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

  ----------------------------------------------------------------------------------
  Method                  Endpoint                           תפקיד
  ----------------------- ---------------------------------- -----------------------
  `GET`                   `/api/dashboard?from=...&to=...`   החזרת KPI, סיכומים,
                                                             מגמות ותחזית לתקופה

  `GET`                   `/api/campaigns`                   רשימת קמפיינים של
                                                             המשתמש

  `POST`                  `/api/campaigns`                   יצירת קמפיין

  `PATCH`                 `/api/campaigns/:id`               עדכון קמפיין

  `DELETE`                `/api/campaigns/:id`               מחיקת קמפיין

  `POST`                  `/api/imports/preview`             פענוח קובץ, בדיקת מבנה
                                                             והצגת תוצאות/שגיאות
                                                             לפני שמירה

  `POST`                  `/api/imports/commit`              שמירת שורות תקינות לאחר
                                                             אימות ואישור משתמש

  `GET`                   `/api/imports/:id`                 סטטוס ותוצאות ייבוא

  `GET`                   `/api/alerts`                      רשימת התראות והיסטוריה

  `PATCH`                 `/api/alerts/:id`                  סימון התראה כנקראה

  `GET` / `PUT`           `/api/alert-settings`              קריאה ועדכון של ספי
                                                             התראות

  `POST`                  `/api/advisor`                     שליחת שאלה וקבלת
                                                             ניתוח/המלצה מה-AI
  ----------------------------------------------------------------------------------

הטבלה מתארת חוזה לוגי מוצע. ניתן לממש חלק מהפעולות כ-Server Actions בלי
Endpoint ציבורי נפרד, כל עוד גבולות האבטחה והאחריות נשמרים.

### 4.3 חוזה תשובת AI

השרת ידרוש פלט מובנה שכולל, לפי הצורך: - `answer`: הסבר בשפה טבעית
בעברית. - `recommendations`: מערך המלצות. - `campaign_id` או מזהי
קמפיינים רלוונטיים. - `action_type`: למשל increase, decrease או
reallocate. - `amount_ils` ו/או `percentage`. - `rationale`: הסבר מבוסס
נתונים. - `expected_impact`: הערכה צפויה, אם אפשר לחשב או להעריך. -
`limitations`: נתונים חסרים והסתייגויות.

כל פלט יעבור Zod validation לפני החזרה ל-Frontend. ה-AI אינו רשאי לבצע
פעולות כתיבה לתקציבים או לפלטפורמות פרסום.

------------------------------------------------------------------------

## 5. Data Flow

### 5.1 הזנה ידנית ועדכון מדדים

1.  המשתמש מתחבר באמצעות Google.
2.  ה-Frontend שולח פעולה לשרת עם Session תקף.
3.  השרת מאמת את המשתמש ומוודא שכל מזהי הרשומות שייכים אליו.
4.  הנתונים עוברים ולידציה באמצעות Zod ובדיקות DB constraints.
5.  הנתונים נשמרים ב-PostgreSQL.
6.  השרת מפעיל Metrics Service ו-Alert Service.
7.  Dashboard מקבל נתונים מחושבים ומציג מדדים זמינים בלבד.

### 5.2 ייבוא CSV / Excel

1.  המשתמש בוחר קובץ ומעלה אותו ל-`/api/imports/preview`.
2.  Route Handler בודק סוג קובץ, גודל, מספר שורות ומבנה בסיסי.
3.  SheetJS/CSV parser קורא את הנתונים בשרת.
4.  Import Service ממפה שדות, מנרמל תאריכים ומספרים ומריץ ולידציה.
5.  המערכת מציגה למשתמש שורות תקינות, שורות שגויות והתאמות אפשריות
    לרשומות קיימות.
6.  לאחר אישור המשתמש, `/api/imports/commit` מבצע Upsert מבוקר בתוך
    Transaction, לפי מפתח ההתאמה שהוגדר.
7.  מתעדכן `import_jobs`, ומופעלים מחדש Metrics Service ו-Alert Service.
8.  הקובץ הזמני נמחק בסיום הבקשה/התהליך; אין צורך ב-Persistent File
    Storage ב-MVP כל עוד לא נדרש לשמור קובצי מקור או דוחות.

### 5.3 חישובי מדדים

החישובים יבוצעו בקוד שרת דטרמיניסטי, ולא באמצעות LLM: -
`CPL = spend / leads` - `Cost per Deal = spend / deals` -
`CAC = spend / new_customers` - `ROAS = attributed_revenue / spend` -
`Remaining Budget = planned_budget - actual_spend`

אם המכנה הוא 0 או חסר, התוצאה תהיה `null` / Not Available עם סיבת החוסר.
יש להציג את המדד רק כאשר הנתונים הנדרשים זמינים.

### 5.4 תחזית חודשית

-   Forecast Service יחשב תחזית לפי קצב ההוצאות וההכנסות עד כה, וישקלל
    מגמות מתקופות קודמות כאשר קיימים נתונים היסטוריים מספיקים.
-   החישוב יהיה דטרמיניסטי ומתועד בקוד; ה-AI יוכל להסביר את התחזית אך לא
    להמציא או לשנות את המספרים.
-   יש להפריד בין `actual`, `forecast` ו-`target` בתשובת השרת ובתצוגה.
-   כאשר אין מספיק היסטוריה, המערכת תציג תחזית בסיסית/מוגבלת או תסמן
    אותה כלא זמינה, בהתאם ליכולת לחשב אותה מהנתונים הקיימים.
-   יש לציין למשתמש שהתחזית היא הערכה ולא הבטחה לתוצאה.

### 5.5 תהליך התראות

-   לאחר כל שמירה ידנית או Commit של ייבוא, Alert Service בודק את הספים
    שהוגדרו.
-   בדיקות אפשריות: קצב הוצאות מול התקציב, ירידה במדד ביצועים, התקרבות
    ליעד או חריגה ממנו.
-   כל התראה תקבל `dedupe_key` שמזהה את סוג ההתראה והישות/תקופה, כדי
    למנוע יצירה חוזרת של אותה התראה ללא שינוי מהותי.
-   ההתראה נשמרת ב-DB ומוחזרת ל-Frontend; הודעה קופצת מוצגת כאשר המשתמש
    פעיל.
-   אין צורך ב-Cron או Background Worker ב-MVP, משום שהדרישה היא לבדוק
    בעת עדכון/ייבוא נתונים ולא באופן מתוזמן.

### 5.6 תהליך AI Budget Advisor

1.  המשתמש שולח שאלה.
2.  השרת מאמת Session ומגביל את קצב הבקשות (Rate Limiting).
3.  Advisor Service שולף רק נתונים השייכים למשתמש ורלוונטיים לשאלה.
4.  Metrics/Forecast Services מחשבים מדדים, מגמות ותחזיות באופן
    דטרמיניסטי.
5.  השרת בונה Context מצומצם ומסיר פרטים שאינם נחוצים.
6.  השרת שולח ל-OpenAI API את השאלה, המדדים וההקשר העסקי הרלוונטי, ללא
    מפתחות או פרטי Authentication.
7.  OpenAI מחזיר Structured Output לפי JSON Schema.
8.  השרת מאמת את הפלט, בודק שמזהי הקמפיינים קיימים ושסכומי ההמלצה אינם
    חורגים מהנתונים הזמינים.
9.  השרת מחזיר תשובה בעברית עם הסבר, סכום/אחוז מוצע והסתייגויות.
10. לא מתבצעת כתיבה אוטומטית לתקציב או לפלטפורמת פרסום.

------------------------------------------------------------------------

## 6. Authentication, Authorization ואבטחה

### 6.1 Authentication

-   Supabase Auth ינהל התחברות Google OAuth.
-   יש להגדיר Google OAuth Client ב-Google Cloud Console ולהזין את
    Client ID ו-Client Secret ב-Supabase Dashboard.
-   יש להגדיר Redirect URLs ל-Development ול-Production בנפרד.
-   ב-Next.js יש להשתמש ב-Supabase SSR client וב-Cookie-based Sessions
    בהתאם לתיעוד Supabase ל-Next.js.
-   דפים מוגנים ופעולות שרת יוודאו Session תקף; אין להסתמך על הסתרת
    מסכים ב-Frontend בלבד.

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
    למשימות מערכת הכרחיות; אין לחשוף אותו ל-Client. ככל האפשר, פעולות
    משתמש רגילות יתבצעו עם Session המשתמש ו-RLS.

מקור: [Supabase Row Level
Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 6.3 הגנה על קבצים

-   לקבל רק CSV ו-XLSX, ולהגדיר מגבלת גודל ומספר שורות.
-   לבצע Parsing וולידציה בצד השרת.
-   לא לסמוך על סיומת הקובץ בלבד; לבדוק MIME/signature ומבנה תוכן ככל
    האפשר.
-   להימנע מהפעלת Macros; לא להריץ תוכן מתוך קבצים.
-   למנוע Formula Injection כאשר נתונים מיוצאים בעתיד לקובצי CSV.
-   לא לשמור קובץ מקור לצמיתות ב-MVP אלא אם תתווסף דרישה מפורשת.

### 6.4 הגנה על AI

-   OpenAI API Key נשמר כ-Environment Variable בשרת בלבד.
-   יש להגדיר Rate Limit לפי משתמש ולפי IP, מגבלת Tokens ובקרת עלויות.
-   אין לשלוח למודל פרטי Google OAuth, Tokens, סיסמאות או מידע אישי
    שאינו נדרש לניתוח.
-   יש להתייחס לתוכן שהמשתמש הזין ולקובצי הייבוא כנתונים, לא כהוראות
    מערכת למודל.
-   המודל לא מקבל כלים שמאפשרים כתיבה למסד הנתונים או שינוי תקציב.
-   כל סכום/אחוז שיוצג כהמלצה חייב לעבור בדיקות לוגיות בצד השרת.

### 6.5 פרטיות ושמירת נתונים

-   כל משתמש רואה רק את נתוניו.
-   יש להגדיר מדיניות פרטיות ותנאי שימוש לפני השקה.
-   יש להגדיר תהליך למחיקת חשבון ונתונים בהתאם למדיניות המוצר והדין החל.
-   יש להימנע מלוגים המכילים תוכן פיננסי מפורט או פרטי משתמש שאינם
    נחוצים.
-   יש להגדיר Retention לשיחות Advisor ולייבואים בהתאם להחלטת המוצר;
    ברירת המחדל היא לא לשמור קובצי מקור.

------------------------------------------------------------------------

## 7. Environments, GitHub, Migrations ו-Deployment

### 7.1 סביבות נפרדות

יש להקים שני פרויקטים נפרדים ב-Supabase:

  -----------------------------------------------------------------------
  סביבה             Supabase Project  שימוש             חיבור מקומי
  ----------------- ----------------- ----------------- -----------------
  Development       `budgi-dev`       פיתוח, בדיקות,    סביבת הפיתוח
                                      נתוני דמה         המקומית בלבד
                                      וניסויים          

  Production        `budgi-prod`      האתר החי ונתוני   אין חיבור ישיר
                                      משתמשים אמיתיים   מהמחשב המקומי
  -----------------------------------------------------------------------

הפרדה זו מונעת מצב שבו בדיקות או ניסויים פוגעים בנתוני משתמשים אמיתיים.

### 7.2 Environment Variables

#### מקומי --- Development בלבד

קובץ `.env.local` במחשב המפתח:

``` env
NEXT_PUBLIC_SUPABASE_URL=https://<DEV_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<DEV_PUBLISHABLE_KEY>
OPENAI_API_KEY=<DEVELOPMENT_OPENAI_KEY>
APP_ENV=development
```

#### Vercel --- Preview

-   משתני Supabase של Development בלבד.
-   מפתח OpenAI ייעודי לסביבת Preview/Development.
-   אין להכניס ערכי Production ל-Preview.

#### Vercel --- Production

-   משתני Supabase של Production בלבד.
-   מפתח OpenAI של Production.
-   כל Secrets נשמרים ב-Vercel Environment Variables ומוגדרים
    כ-Production בלבד.
-   פרטי Production אינם נשמרים בקובצי המחשב המקומי או ב-GitHub.

**חשוב:** - `NEXT_PUBLIC_*` מיועד רק לערכים שמותר לחשוף לדפדפן, כגון
Supabase URL ו-Publishable/Anon Key המוגן באמצעות RLS. -
`OPENAI_API_KEY` וכל Supabase Secret/Service Role Key הם Server-only
ואסור להוסיף להם prefix של `NEXT_PUBLIC_`. - אין להעלות `.env.local`
ל-Git. יש לכלול `.env.example` עם שמות משתנים וערכי placeholder בלבד. -
יש להשתמש במפתחות נפרדים לכל סביבה.

### 7.3 GitHub Repository ו-Branches

-   כל קוד המקור ינוהל ב-GitHub Repository פרטי.
-   `main` הוא Production branch.
-   עבודה חדשה תתבצע ב-feature branch.
-   שינוי ייכנס ל-`main` באמצעות Pull Request לאחר בדיקות.
-   Vercel יחובר ל-GitHub:
    -   Push ל-branch שאינו `main` ייצור Preview Deployment המחובר
        ל-Supabase Development.
    -   Merge ל-`main` ייצור Production Deployment המחובר ל-Supabase
        Production.
-   יש להגדיר ב-Vercel משתני Environment נפרדים ל-Preview ול-Production.
-   אין לבצע Deployment ידני בכל שינוי; Vercel יפעיל Build ו-Deployment
    אוטומטיים בעקבות Git events.

### 7.4 Build ו-Deployment

1.  מפתח דוחף שינוי ל-GitHub.
2.  Vercel מפעיל Install, Build ובדיקות Build.
3.  אם מדובר ב-Pull Request, נוצר Preview URL.
4.  המפתח/המשתמש בודק את הגרסה מול Development.
5.  לאחר אישור, ה-Pull Request מתמזג ל-`main`.
6.  שינויי Database עוברים קודם ל-Production לפי נוהל Migration בסעיף
    הבא.
7.  לאחר שה-Database Production מעודכן, ה-Production Deployment
    נוצר/מקודם ב-Vercel.
8.  מבצעים Smoke Test לכניסה, Dashboard, שמירת נתונים ו-AI.

### 7.5 Database Migrations --- נוהל מחייב

כל שינוי בסכמת PostgreSQL ינוהל באמצעות SQL Migration שנשמר ב-GitHub תחת
`supabase/migrations/`. אין לבצע שינוי סכימה ידני ב-Production ללא
Migration תואם ב-Repository.

**תהליך שינוי רגיל:** 1. יוצרים Migration חדש ב-branch הפיתוח. 2. מחברים
את Supabase CLI לפרויקט `budgi-dev`. 3. מריצים את ה-Migration על
Development. 4. בודקים שהאפליקציה פועלת, שהנתונים נשמרים ושה-RLS
והאילוצים תקינים. 5. מריצים בדיקות DB/RLS. 6. פותחים Pull Request
ומציגים את השינוי לאישור. 7. לאחר אישור המשתמש למעבר Production, ממזגים
ל-`main`. 8. **האדם האחראי על הפריסה (מפתח/מפעיל הפרויקט) מריץ את
ה-Migration על `budgi-prod` לפני פריסת גרסת האפליקציה התלויה בו.** אין
להסתמך על Deployment אוטומטי של Vercel שירוץ לפני עדכון הסכימה. 9. לאחר
הצלחת Migration ובדיקת תקינות, מאפשרים ל-Vercel להשלים את Production
Deployment. 10. מבצעים Smoke Test. במקרה כשל, עוצרים את קידום הגרסה
ומפעילים נוהל Rollback/תיקון.

**כלל סדר פריסה:** - שינוי Additive ותואם לאחור: ניתן להוסיף עמודה/טבלה,
לפרוס קוד שתומך במבנה החדש, ורק בהמשך להסיר מבנה ישן ב-Migration נפרד. -
שינוי Breaking: יש לתכנן מעבר מדורג. לא לפרוס קוד שמצפה לעמודה/טבלה
שעדיין לא קיימת. - אין להריץ Migration אוטומטית כחלק מ-Build של כל
Preview. - Production Migration דורשת אישור מפורש של המשתמש/בעל המוצר
לפני ההרצה.

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
להגדיר ולבדוק אותן בנפרד בשני פרויקטי Supabase: - Google OAuth Provider:
Client ID, Client Secret, Redirect URLs והגדרות Consent Screen. - Site
URL ו-Redirect URL allowlist של Supabase Auth. - הגדרות Email/Auth
נוספות, אם יופעלו בעתיד. - Storage Buckets ו-Policies, אם יתווסף אחסון
קבצים בהמשך. - API Keys ו-Secrets. - הגדרות Webhooks / Edge Functions
Secrets, אם יתווספו בעתיד. - הגדרות Billing, Compute, Backups
ו-Region. - הגדרות Logging ו-Retention.

ב-MVP אין צורך ב-Supabase Storage אם קובצי הייבוא מעובדים זמנית ואינם
נשמרים. אם בעתיד תתווסף שמירת קבצים, יש להקים Bucket נפרד בכל סביבה
ולהגדיר Policies מתאימות.

### 7.7 Supabase Free --- מגבלות שחשוב להכיר

לפי תיעוד Supabase שנבדק: - תוכנית Free מאפשרת עד שני פרויקטים פעילים.
שני הפרויקטים הנדרשים כאן יכולים להתאים למכסה זו, כל עוד לא נוצרים
פרויקטים נוספים בחשבונות/Organizations שבהם המשתמש Owner או Admin. -
פרויקט Free בעל פעילות נמוכה במשך כשבוע עלול להיעצר אוטומטית. הנתונים
נשמרים, אך השירות אינו זמין עד שחוזרים ומחדשים את הפרויקט. - תוכניות
בתשלום אינן עוצרות פרויקטים בגלל חוסר פעילות. - חיוב Supabase מתבצע ברמת
Organization; כל Organization משתמשת בתוכנית אחת. בפרויקט נוסף בתוכנית
Pro עשויה להיות עלות Compute נוספת. - לכן Free מתאים להתחלה ולבדיקות, אך
ל-Production של מוצר אמיתי מומלץ לתקצב תוכנית בתשלום. אם Development
נשאר ב-Free, יש להביא בחשבון השהיה אפשרית.

מקורות: [Free Project
Pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[Billing on
Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase),
[Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq).

------------------------------------------------------------------------

## 8. איכות, בדיקות וניטור

### 8.1 בדיקות

-   **Unit Tests (Vitest):** נוסחאות CPL, CAC, Cost per Deal, ROAS, קצב
    תקציב ותחזיות.
-   **Validation Tests:** נתונים חסרים, אפס במכנה, סכומים שליליים, טווחי
    תאריכים ונתוני ייבוא לא תקינים.
-   **RLS Tests:** משתמש אינו יכול לגשת לנתוני משתמש אחר.
-   **Integration Tests:** יצירה ועדכון קמפיין, ייבוא קובץ, יצירת התראה
    ושמירת יעדים.
-   **End-to-End (Playwright):** Google login בסביבת בדיקות, הגדרת
    תקציב, יצירת קמפיין, הצגת Dashboard וזרימת Advisor.
-   **AI Contract Tests:** תשובות תקינות לפי JSON Schema; טיפול
    ב-refusal, timeout, תשובה חלקית או פלט שאינו עובר validation.

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
