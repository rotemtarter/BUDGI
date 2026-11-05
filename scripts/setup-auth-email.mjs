// Sets up email sign-up for one Supabase project (ADR-21): email provider on
// with confirmation, 15-character minimum password, Hebrew email templates
// and the /auth/confirm redirect URL. Uses the Supabase Management API.
// Reads SUPABASE_ACCESS_TOKEN from .env and never prints it. The email
// sending service (SMTP, Brevo) is set in the Supabase dashboard and is not
// touched here.
//
//   node scripts/setup-auth-email.mjs dev
//   node scripts/setup-auth-email.mjs prod

const PROJECTS = {
  dev: { ref: "gqvxxjxnniihevnzdezv", redirect: "http://localhost:3000/auth/confirm" },
  prod: { ref: "njpylucmtymbotwrqpqq", redirect: "https://budgi-fawn.vercel.app/auth/confirm" },
};

const target = PROJECTS[process.argv[2]];
if (!target) {
  console.error("Usage: node scripts/setup-auth-email.mjs dev|prod");
  process.exit(1);
}

try {
  process.loadEnvFile(".env");
} catch {
  console.error("לא נמצא קובץ .env");
  process.exit(1);
}
// The token itself (sbp_…), even if other text or invisible direction marks
// (added by text editors next to Hebrew) were pasted around or inside it
const token = process.env.SUPABASE_ACCESS_TOKEN?.replace(/[^\x21-\x7e]/g, "").match(/sbp_[A-Za-z0-9]+/)?.[0];
if (!token) {
  console.error("חסר ב-.env: SUPABASE_ACCESS_TOKEN (מפתח שמתחיל ב-sbp_)");
  process.exit(1);
}

const template = (title, text, href, link, ignore) => `<div dir="rtl" style="font-family:Arial,sans-serif">
<h2>${title}</h2>
<p>${text}</p>
<p><a href="${href}">${link}</a></p>
<p>${ignore}</p>
</div>`;

const api = `https://api.supabase.com/v1/projects/${target.ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const current = await fetch(api, { headers });
if (!current.ok) {
  console.error(`Supabase לא אישר את הגישה (${current.status}). בדוק את SUPABASE_ACCESS_TOKEN.`);
  process.exit(1);
}
const config = await current.json();

// Keep the existing redirect URLs and add /auth/confirm
const allowList = new Set(
  String(config.uri_allow_list ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
);
allowList.add(target.redirect);

const body = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  password_min_length: 15,
  uri_allow_list: [...allowList].join(","),
  mailer_subjects_confirmation: "אישור ההרשמה ל-Budgi",
  mailer_templates_confirmation_content: template(
    "ברוכים הבאים ל-Budgi",
    "כדי להשלים את ההרשמה, לחץ על הקישור:",
    "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding",
    "אישור כתובת האימייל",
    "אם לא נרשמת ל-Budgi, אפשר להתעלם מהמייל.",
  ),
  mailer_subjects_recovery: "איפוס הסיסמה ב-Budgi",
  mailer_templates_recovery_content: template(
    "בחירת סיסמה חדשה",
    "לחץ על הקישור כדי לבחור סיסמה חדשה:",
    "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password",
    "בחירת סיסמה חדשה",
    "אם לא ביקשת לאפס סיסמה, אפשר להתעלם מהמייל.",
  ),
};

const saved = await fetch(api, { method: "PATCH", headers, body: JSON.stringify(body) });
if (!saved.ok) {
  const reason = await saved.text();
  console.error(`השמירה נכשלה (${saved.status}): ${reason.slice(0, 300)}`);
  process.exit(1);
}

// Read back and show what is set (no secrets)
const after = await (await fetch(api, { headers })).json();
console.log(`הוגדר בפרויקט ${process.argv[2]} (${target.ref}):`);
console.log(`- אימייל וסיסמה: ${after.external_email_enabled ? "פעיל" : "כבוי"}, אישור במייל: ${after.mailer_autoconfirm ? "לא" : "כן"}`);
console.log(`- אורך סיסמה מינימלי: ${after.password_min_length}`);
console.log(`- שליחה דרך: ${after.smtp_host}:${after.smtp_port}, בשם: ${after.smtp_sender_name}`);
console.log(`- נושא מייל אישור: ${after.mailer_subjects_confirmation}`);
console.log(`- נושא מייל איפוס: ${after.mailer_subjects_recovery}`);
console.log(`- כתובת חזרה: ${after.uri_allow_list?.includes(target.redirect) ? "נוספה" : "חסרה"}`);
