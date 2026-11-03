# תוכנית — Milestone 3: קמפיינים והזנת נתונים שבועיים

> מקורות: `MILESTONES.md` (Milestone 3), `PRD.md` (3.2, 3.3, 4.2, 4.3, 4.4, 4.8, 5.6), `ARCHITECTURE.md` (2.2, 2.3, 3.1–3.4, 4.1, 5.1, 5.3, 6.2, 7.5, 8.1, ADR-1, ADR-6), `DESIGN.md` (1.4, 1.5, 1.14, 1.15, 1.16, 2.1–2.5).
> מחוץ לאבן הדרך: ייבוא (M4; כפתור „ייבוא נתונים” מוביל לדף „בקרוב” הקיים), מסכי בית/מדדים/תקציב ובורר תקופה (M5), תחזית (M6), התראות קופצות אחרי שמירה (M7), מחיקת חשבון (M9).

## 1. מטרה ותוצר

בסוף אבן הדרך:
- מסך „קמפיינים” מציג את הקמפיינים של המשתמש בטבלה (במחשב) או ככרטיסים (במובייל), עם מסנן סטטוס, ומצב ריק כשאין קמפיינים.
- מסך „קמפיין חדש” יוצר קמפיין בסטטוס „פעיל”, עם תקציב אופציונלי לחודש הנוכחי, ופותח את מסך פרטי הקמפיין.
- מסך פרטי קמפיין: כרטיס תקציב החודש (עם עריכה), ארבעה KPI לחודש הנוכחי, וטבלת נתונים שבועיים עם הוספה, עריכה ומחיקה.
- חלונית „עריכת פרטים”: שם, פלטפורמה, סטטוס ותיאור; מחיקת קמפיין רק כשאין לו נתונים שבועיים.
- טבלאות `campaigns`, `campaign_budgets`, `campaign_performance` עם אילוצים ו-RLS ב-`budgi-dev`.
- תקציבי הקמפיינים הפעילים מועתקים אוטומטית לחודש חדש (הרחבה של `ensure_month_defaults`).
- בדיקות Unit, Integration, RLS ו-Playwright.

## 2. החלטות טכניות לאבן הדרך

| נושא | החלטה | הסבר קצר |
|---|---|---|
| Next.js 16 | לפני הכתיבה — לקרוא ב-`node_modules/next/dist/docs` את הנושאים הרלוונטיים: Dynamic Routes (`[id]`, `params` כ-Promise), `notFound`, `forms.md`, `server-actions.md`, ו-`cacheComponents` (כל קריאה של Session/DB בתוך `<Suspense>`, כמו ב-M2) | ההנחיה ב-`AGENTS.md` |
| ממשק שרת | Server Actions + Server Components, כמו ב-M2 (ARCHITECTURE 4.1 מתיר זאת). אין Route Handlers חדשים. כל Action קורא `requireOnboardedUser()`, מאמת ב-Zod ומחזיר `FormResult` | עקביות עם הקוד הקיים |
| נתיבים | `/campaigns` (רשימה), `/campaigns/new` (יצירה), `/campaigns/[id]` (פרטים). `isActive` הקיים כבר משאיר את „קמפיינים” מסומן בתתי-הנתיבים. מזהה שאינו UUID או שאינו שייך למשתמש → `notFound()` | DESIGN 1.15 |
| שבוע | `src/lib/dates/week.ts`: `startOfWeek(date)` מחזיר את יום ראשון של אותו שבוע (`YYYY-MM-DD`, חישוב ב-UTC על תאריך בלבד, בלי שעות); `isWeekStart`; `formatWeekRange` → „25.10–31.10”. הנרמול נעשה בשרת לפני שמירה, וגם בלקוח כדי להציג את טווח השבוע שנבחר | PRD 4.3, ARCHITECTURE 5.1 |
| הזנת שבוע | השמירה היא Upsert לפי `(campaign_id, week_start)`: החלונית תמיד „שייכת” לשבוע שנבחר. כשבוחרים תאריך, הלקוח בודק ברשימת השבועות שכבר נטענה אם לשבוע יש נתונים — אם כן, השדות מתמלאים בהם ומוצגת הודעה „לשבוע הזה כבר יש נתונים — השמירה תעדכן אותם”. שמירה ידנית כותבת את כל חמשת השדות (ריק → `NULL`) ו-`source = 'manual'`. אין „העברה” של שורה לשבוע אחר | DESIGN 1.5; מונע שתי שורות לאותו שבוע גם בממשק וגם ב-DB |
| ולידציה | `src/lib/validation/campaigns.ts`: שם (חובה, אחרי trim, עד 100 תווים), פלטפורמה (אחת מארבע), סטטוס, תיאור (אופציונלי, עד 500 תווים), תקציב (`numberField` הקיים). `src/lib/validation/weeks.ts`: תאריך תקין + חמשת השדות — `numberField` להוצאה/הכנסות, `numberField({ integer: true })` ללידים/עסקאות/לקוחות; לפחות שדה אחד מלא („יש למלא לפחות שדה אחד”). מגבלות האורך הן הגנה טכנית בלבד | PRD 4.3, 4.8 |
| שם כפול | DB: Unique על `(user_id, lower(trim(name)), platform)`. השרת מתרגם שגיאת `23505` להודעה על שדה השם: „כבר קיים קמפיין בשם הזה בפלטפורמה הזו” (ביצירה ובעריכה) | DESIGN 1.16 |
| מחיקת קמפיין | ה-Action בודק שאין שורות ב-`campaign_performance`, וה-DB אוכף זאת ב-FK. הכפתור מוצג רק כשאין שבועות; שגיאת `23503` מתורגמת ל„אי אפשר למחוק קמפיין שיש לו נתונים. אפשר לסמן אותו כ'הסתיים'” | PRD 4.3, ARCHITECTURE 3.2 |
| תקציב קמפיין „ריק” | `campaign_budgets.planned_amount` מאפשר `NULL` = „אין תקציב לקמפיין בחודש הזה”. שמירת תקציב תמיד כותבת שורה לחודש (גם כשהשדה ריק) | אותה בעיה שנפתרה ביעדים ב-ADR-6: בלי זה, תקציב שנמחק היה „חוזר” בהעתקה. יתועד כ-ADR-7 |
| העתקה לחודש חדש | `ensure_month_defaults(p_month)` מורחבת: לכל קמפיין בסטטוס `active` שאין לו שורה ב-`campaign_budgets` לחודש המבוקש — מעתיקים את השורה שלו מהחודש האחרון שלפני החודש המבוקש (אם יש). `ON CONFLICT DO NOTHING`. נקראת לפני כל קריאה של תקציבי קמפיינים לחודש (רשימה ופרטים) | PRD 4.2, ARCHITECTURE 3.2 |
| חישובים לחודש הנוכחי | מסך הקמפיינים ומסך הפרטים צריכים כבר עכשיו הוצאה החודש, ROAS ושינוי מול החודש הקודם, ו-CPL / Cost per Deal / CAC / ROAS. לכן נבנה עכשיו **החלק הבסיסי של ה-Metrics Service** כפונקציות טהורות ב-`src/server/services/metrics.ts`: (1) חלק השבוע בחודש = ימי השבוע בחודש ÷ 7; (2) סכום לחודש לאחר חלוקה (שדה `NULL` אינו נספר); (3) יחס בין שני שדות רק מהשורות שבהן שניהם הוזנו, ו-`null` כשהמכנה 0 או חסר; (4) שינוי באחוזים מול החודש הקודם. ב-M5 השירות יורחב (שבועות, יעדים, פערים) ולא ייכתב מחדש | DESIGN 1.4 ו-1.5 דורשים את המספרים האלה; ARCHITECTURE 3.2, 5.3 |
| תצוגת ערכים | ערך `null` מוצג „—”. סכומים ב-`formatILS`; ROAS עם ספרה אחת; אחוזים עם ספרה אחת לכל היותר; מספרים שלמים שחולקו מעוגלים בתצוגה בלבד. שינוי לטובה בירוק, לרעה באדום, עם חץ (ב-CPL, CAC ו-Cost per Deal ירידה היא לטובה) | DESIGN 2.2, 2.3 |
| לוגואי פלטפורמות | רכיב `PlatformLogo` עם קובצי SVG מקומיים (בלי ספרייה חדשה) מתוך `simple-icons` (רישיון CC0) בצבעים הרשמיים: Meta, Google Ads, TikTok. LinkedIn הוסר מ-`simple-icons` — לוגו ה-„in” הרשמי מתוך מערכת המותג של LinkedIn. `alt`/`aria-label` עם שם הפלטפורמה. בדיקה בזמן הבנייה שהלוגואים נכונים | DESIGN 2.3 („תגית פלטפורמה”) |
| רכיבי shadcn חדשים | `dialog` (חלונית שבוע ו„עריכת פרטים”: Modal במחשב, מסך מלא מתחת ל-768px), `alert-dialog` (אישורי מחיקה), `select` (בחירת פלטפורמה עם לוגו ליד כל אפשרות; בחירת סטטוס), `textarea`, `badge` (תגיות סטטוס, פלטפורמה ומקור). בחירת שבוע — `<input type="date">` של הדפדפן, מיושר כמו שאר השדות | DESIGN 1.5, 2.3 |
| מסנן סטטוס | פרמטר בכתובת `?status=active|paused|ended|all`, ברירת מחדל `active`. מסנן ריק (יש קמפיינים, אבל לא בסטטוס הזה) מציג שורה קצרה „אין קמפיינים בסטטוס הזה”; המצב הריק המלא של DESIGN 1.14 מוצג רק כשאין קמפיינים בכלל | DESIGN 1.4 |
| טבלה ומובייל | טבלה רגילה (`<table>` עם כותרות `<th scope>`), שורה שלמה היא קישור לפרטים (נגישה במקלדת). מתחת ל-768px: רשימת כרטיסים לפי DESIGN 1.4. טבלת השבועות בפרטים נגללת אופקית בתוך המכל במובייל | DESIGN 2.4 |
| Migrations | כמו ב-ADR-6: קובץ ב-`supabase/migrations/`, מוחל על `budgi-dev` דרך Supabase MCP (`apply_migration`) אחרי שווידאתי ששם הפרויקט `budgi-dev`; שם הקובץ מיושר לגרסה שנרשמה. אחר כך `generate_typescript_types` ועדכון `database.types.ts`, ו-`get_advisors` (security) | ARCHITECTURE 7.5 |
| חשיפה ב-Data API | לפי ADR-6, טבלאות נחשפות ב-Data API רק אם נבחרו בהגדרות הפרויקט. אחרי ה-Migration בודקים אם שלוש הטבלאות החדשות נגישות. אם לא — עוצרים ומדריכים אותך צעד אחר צעד לסמן אותן ב-Supabase | ADR-6 |

## 3. Database — Migration אחד: `supabase/migrations/<version>_campaigns_and_weekly_performance.sql`

### `campaigns`
- `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `name text not null`, `platform text not null`, `status text not null default 'active'`, `description text`, `created_at`, `updated_at` (Trigger `set_updated_at` הקיים).
- CHECK: `platform in ('meta_ads','google_ads','tiktok_ads','linkedin_ads')`, `status in ('active','paused','ended')`, `name = trim(name) and name <> ''`.
- Unique index: `(user_id, lower(trim(name)), platform)`.
- `unique (id, user_id)` — יעד ל-Foreign Keys מורכבים (ראו למטה).
- אינדקס על `user_id` (מכוסה גם על ידי האינדקס הייחודי).

### `campaign_budgets`
- `id`, `user_id` (default `auth.uid()`, FK ל-`auth.users` cascade), `campaign_id uuid not null`, `month date not null`, `planned_amount numeric(12,2)` (מאפשר `NULL`, ראו ADR-7), `updated_at`.
- FK מורכב `(campaign_id, user_id) references campaigns(id, user_id) on delete cascade` — שורה תמיד שייכת לבעל הקמפיין, ותקציב נמחק עם קמפיין ריק.
- Unique `(campaign_id, month)`; CHECK יום ראשון בחודש; CHECK `planned_amount is null or planned_amount >= 0`; אינדקס `(user_id, month)`.

### `campaign_performance`
- `id`, `user_id` (default `auth.uid()`, FK cascade), `campaign_id uuid not null`, `week_start date not null`, `spend numeric(12,2)`, `leads integer`, `deals integer`, `new_customers integer`, `revenue numeric(12,2)`, `source text not null default 'manual'`, `created_at`, `updated_at`.
- FK מורכב `(campaign_id, user_id) references campaigns(id, user_id) on delete restrict` (ARCHITECTURE 3.4).
- Unique `(campaign_id, week_start)`; אינדקס `(user_id, week_start)`.
- CHECK: `extract(dow from week_start) = 0`; כל אחד מחמשת השדות `is null or >= 0`; `num_nonnulls(spend, leads, deals, new_customers, revenue) >= 1`; `source in ('manual','import')`.
- **בדיקה בזמן הבנייה:** ב-`budgi-dev`, בתוך טרנזקציה שמבוטלת (`begin … rollback`) — ליצור משתמש זמני עם קמפיין ושבוע, ולוודא שמחיקת המשתמש (Cascade, M9) עדיין עובדת עם `RESTRICT`. אם לא — להחליף ל-`NO ACTION` (חוסם מחיקת קמפיין בדיוק אותו דבר, אבל נבדק בסוף הפקודה) ולתעד ADR.

### RLS ו-Grants (לשלוש הטבלאות)
- RLS מופעל. מדיניות `select`/`insert`/`update`/`delete` ל-`authenticated` עם `user_id = (select auth.uid())`; ב-`update` גם `using` וגם `with check`.
- `revoke all … from anon, authenticated`; `grant select, insert, update, delete … to authenticated`.
- ה-FK המורכב מבטיח שמשתמש B לא יכול להוסיף שבוע או תקציב לקמפיין של A גם אם ניחש את המזהה.

### `ensure_month_defaults` (create or replace)
- הקוד הקיים (תקציב כולל ויעדים) נשאר, ובסוף נוסף:
  ```sql
  insert into public.campaign_budgets (user_id, campaign_id, month, planned_amount)
  select v_user, c.id, p_month, prev.planned_amount
  from public.campaigns c
  cross join lateral (
    select cb.planned_amount from public.campaign_budgets cb
    where cb.campaign_id = c.id and cb.month < p_month
    order by cb.month desc limit 1
  ) prev
  where c.user_id = v_user and c.status = 'active'
    and not exists (select 1 from public.campaign_budgets x where x.campaign_id = c.id and x.month = p_month)
  on conflict (campaign_id, month) do nothing;
  ```
- ה-Grants וה-revoke מ-`anon` נשארים כמו ב-M2.

## 4. קבצים ליצור / לשנות

### Database ו-Types
- `supabase/migrations/<version>_campaigns_and_weekly_performance.sql` — חדש (סעיף 3).
- `src/lib/supabase/database.types.ts` — לייצר מחדש.

### lib (משותף לקליינט ולשרת)
- `src/lib/campaigns/platforms.ts` — רשימת הפלטפורמות (`value`, `label`) והסטטוסים (`value`, תווית עברית: פעיל / מושהה / הסתיים). ישמש גם את הייבוא ב-M4.
- `src/lib/dates/week.ts` — `startOfWeek`, `isWeekStart`, `formatWeekRange`, `addDays`.
- `src/lib/validation/campaigns.ts`, `src/lib/validation/weeks.ts` — סכמות Zod (סעיף 2).
- `src/lib/format/metrics.ts` (או הרחבת `src/lib/currency/format.ts`) — `formatRoas`, `formatPercent`, `formatCount`, וערך `null` → „—”.

### server
- `src/server/repositories/campaigns.ts` — `listCampaigns(status)`, `getCampaign(id)`, `createCampaign(...)` (קמפיין + תקציב לחודש הנוכחי), `updateCampaign(...)`, `deleteCampaign(id)`, `hasPerformance(id)`.
- `src/server/repositories/campaign-budgets.ts` — `getCampaignBudgets(month)` (קורא קודם ל-`ensure_month_defaults`), `saveCampaignBudget(campaignId, month, amount|null)`.
- `src/server/repositories/performance.ts` — `listWeeks(campaignId)` (החדש למעלה), `listWeeksForRange(from, to)` (לחישובי החודש), `upsertWeek(...)`, `deleteWeek(campaignId, weekStart)`.
- `src/server/services/metrics.ts` — הפונקציות הטהורות מסעיף 2, ו-`campaignMonthSummary(rows, month)` שמחזיר `spend`, `leads`, `deals`, `newCustomers`, `revenue`, `cpl`, `costPerDeal`, `cac`, `roas`.

### features (Server Actions ורכיבי לקוח)
- `src/features/campaigns/actions.ts` — `createCampaignAction`, `updateCampaignAction`, `deleteCampaignAction`, `saveCampaignBudgetAction` (חודש נוכחי בלבד).
- `src/features/campaigns/campaign-form.tsx` — טופס יצירה (DESIGN 1.16).
- `src/features/campaigns/edit-campaign-dialog.tsx` — „עריכת פרטים” + מחיקת קמפיין עם `alert-dialog`.
- `src/features/campaigns/budget-card.tsx` — כרטיס תקציב החודש עם אייקון עריכה (שדה inline + שמירה/ביטול).
- `src/features/campaigns/status-filter.tsx` — מסנן הסטטוס (קישורים/כפתורים עם `aria-current`).
- `src/features/weeks/actions.ts` — `saveWeekAction`, `deleteWeekAction`.
- `src/features/weeks/week-dialog.tsx` — חלונית הזנת שבוע (סעיף 2).
- `src/features/weeks/weeks-table.tsx` — הטבלה, תגית מקור, כפתורי עריכה ומחיקה (עם תוויות נגישות), אישור מחיקה.
- אחרי כל שמירה מוצלחת: `router.refresh()` ו-Toast הצלחה; שגיאה — Toast אדום ושגיאות שדה מתחת לשדות.

### components
- `src/components/campaigns/platform-logo.tsx`, `platform-badge.tsx`, `status-badge.tsx`, `source-badge.tsx`.
- `src/components/common/kpi-card.tsx` — תווית, ערך, שינוי מול החודש הקודם (חץ + צבע), גרסה קטנה. ישמש שוב ב-M5.
- `src/components/common/change-indicator.tsx` — חץ ואחוז שינוי, עם „לטובה” לפי סוג המדד.
- `src/components/ui/` — `dialog`, `alert-dialog`, `select`, `textarea`, `badge` דרך `npx shadcn add`.

### app
- `src/app/(app)/campaigns/page.tsx` — מחליף את „בקרוב”: כותרת, כפתורים „קמפיין חדש” ו„ייבוא נתונים”, מסנן, טבלה/כרטיסים, מצב ריק, Skeleton.
- `src/app/(app)/campaigns/new/page.tsx` — מסך יצירה.
- `src/app/(app)/campaigns/[id]/page.tsx` — מסך פרטים: קישור „← קמפיינים”, לוגו 32px + שם (H2) + תגיות + „עריכת פרטים”, כרטיס תקציב, ארבעה KPI, טבלת שבועות או המצב הריק „עוד לא הוזנו נתונים לקמפיין הזה” עם „הוספת שבוע”.

### tests
- `tests/support/test-users.ts` — `resetTestUser` מוחק קודם `campaign_performance`, אחר כך `campaign_budgets` ו-`campaigns`, ואז תקציבים ויעדים.
- `tests/unit/week.test.ts` — נרמול ליום ראשון (כולל יום ראשון עצמו, שבת, מעבר שנה), טווח שבוע.
- `tests/unit/campaign-validation.test.ts` — שם ריק/רווחים, פלטפורמה לא חוקית, ערכים שליליים, שבר בלידים/עסקאות/לקוחות, שורה בלי אף ערך, שדה ריק → `null`.
- `tests/unit/metrics.test.ts` — שבוע שחוצה חודשים (29.9–5.10: 2/7 ו-5/7), יחס רק משורות עם מונה ומכנה, מכנה 0 → `null`, שינוי מול חודש קודם.
- `tests/integration/campaigns.test.ts` (משתמש B) — שם כפול בהבדלי רישיות/רווחים נדחה (`23505`), אותו שם בפלטפורמה אחרת מותר, שבוע כפול נדחה, `week_start` שאינו ראשון נדחה (`23514`), שורה בלי ערכים נדחית, ערך שלילי נדחה, מחיקת קמפיין עם נתונים נחסמת (`23503`) ובלי נתונים מצליחה, `ensure_month_defaults` מעתיק תקציב רק לקמפיינים פעילים ואינו דורס חודש קיים (כולל `NULL`).
- `tests/rls/rls.test.ts` — הרחבה: B לא קורא/מעדכן/מוחק קמפיינים, תקציבי קמפיינים ושבועות של A; B לא יכול להוסיף שבוע או תקציב לקמפיין של A; אנונימי לא רואה כלום.
- `tests/e2e/campaigns.spec.ts` (desktop + mobile) — מצב ריק → יצירת קמפיין → מעבר לפרטים; שם כפול מציג שגיאה; הוספת שבוע עם תאריך שאינו ראשון → מוצג טווח ראשון–שבת; שדה ריק מוצג „—”; ולידציה (שלילי, שבר, שורה ריקה); בחירה מחדש של אותו שבוע פותחת את הנתונים הקיימים; עריכה ומחיקה של שבוע; כפתור מחיקת קמפיין לא מוצג כשיש נתונים; שינוי סטטוס ל„מושהה” והמסנן; מחיקת קמפיין ריק; במובייל — כרטיסים במקום טבלה.

### מסמכים
- `spec/ARCHITECTURE.md` — הוספת ADR-7 (תקציב קמפיין `NULL`, FK מורכב, הרחבת `ensure_month_defaults`, וחלק ה-Metrics Service שנבנה כבר עכשיו). ADR נוסף רק אם `RESTRICT` הוחלף.
- `spec/MILESTONES.md` — 🟡 ליד Milestone 3 בסיום הבנייה.

## 5. סדר עבודה

1. קריאת מסמכי Next.js הרלוונטיים ב-`node_modules/next/dist/docs`.
2. Migration → החלה על `budgi-dev` → בדיקת Cascade (סעיף 3) → `get_advisors` → בדיקת חשיפה ב-Data API (אם צריך — עצירה והדרכה) → Types.
3. lib: פלטפורמות, שבוע, ולידציה, פורמטים + בדיקות Unit.
4. Metrics Service הבסיסי + בדיקות Unit.
5. Repositories ו-Server Actions + בדיקות Integration ו-RLS.
6. רכיבי UI (shadcn, תגיות, לוגואים, KPI).
7. מסכים: יצירה → פרטים (תקציב, KPI, שבועות, עריכת פרטים) → רשימה.
8. Playwright, ואז `lint`, `typecheck`, `test`, `test:e2e`, `build`.
9. בדיקה ידנית שלי בדפדפן (מחשב ומובייל, RTL, Focus במקלדת), סגירת ההרצה, ADR-7 ו-🟡.

## 6. מה נדרש ממך במהלך הבנייה

- כנראה כלום. אם שלוש הטבלאות החדשות לא ייחשפו אוטומטית ב-Data API של Supabase — אעצור ואדריך אותך לסמן אותן בהגדרות (כמה לחיצות).

## 7. בדיקה מול ה-Definition of Done

| תנאי | איך נבדק |
|---|---|
| יצירה, הצגה ועדכון קמפיין, כולל סטטוס | E2E: יצירה, פרטים, „עריכת פרטים”, שינוי סטטוס ומסנן |
| אין שני קמפיינים עם אותו שם ופלטפורמה | Unique ב-DB + Integration + E2E (הודעת שגיאה) |
| הזנה, עריכה ומחיקה של שבוע; אין שתי שורות לאותו שבוע | E2E + Unique ב-DB + Integration |
| תאריך שאינו ראשון מנורמל לראשון | Unit + E2E (טווח השבוע בחלונית ובטבלה) + CHECK ב-DB |
| שדה ריק נשמר כ„לא הוזן” ומוצג „—” | Unit (ריק → `null`) + E2E |
| ולידציה מונעת שליליים ושברים בלידים/עסקאות/לקוחות | Unit + E2E + CHECK ו-`integer` ב-DB |
| קמפיין עם נתונים לא נמחק; ריק נמחק | FK + Integration + E2E |
| RLS מונע גישה לנתוני משתמש אחר | `tests/rls/rls.test.ts` |
| בדיקות Unit, Integration ו-Playwright עוברות | `npm test`, `npm run test:e2e` |
| ה-Migrations הורצו ונבדקו ב-`budgi-dev` | `list_migrations` + כל הבדיקות מול `budgi-dev` |
