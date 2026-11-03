import "server-only";
import { getCurrentUser } from "@/server/auth/session";
import { MAX_FILE_BYTES } from "@/lib/imports/fields";
import { FILE_MESSAGES } from "@/lib/imports/messages";
import { ImportFileError, type UploadedFile } from "./parse-file";
import { ImportInputError } from "@/server/services/imports";

// Shared request handling of the /api/imports/* Route Handlers

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export const fail = (message: string, status: number) => json({ ok: false, message }, status);
export const ok = (body: object) => json({ ok: true, ...body });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GENERIC_MESSAGE = "משהו השתבש. נסה שוב.";

// Signed in and finished onboarding; null when allowed
export async function denyUnlessOnboarded(): Promise<Response | null> {
  const user = await getCurrentUser();
  if (!user) return fail("יש להתחבר מחדש", 401);
  if (!user.onboarded) return fail("יש להשלים את ההגדרה הראשונית", 403);
  return null;
}

// `campaign`: the campaign id for an import into one campaign
type Upload = { file: UploadedFile; mapping: unknown; campaign: string | null };

// multipart form: "file" and an optional JSON "mapping"
export async function readUpload(request: Request): Promise<Upload | Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(FILE_MESSAGES.unreadable, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("לא נבחר קובץ", 400);
  if (file.size > MAX_FILE_BYTES) return fail(FILE_MESSAGES.tooBig, 413);

  let mapping: unknown = undefined;
  const rawMapping = form.get("mapping");
  if (typeof rawMapping === "string") {
    try {
      mapping = JSON.parse(rawMapping);
    } catch {
      mapping = null;
    }
  }
  const campaign = form.get("campaign");
  if (campaign !== null && (typeof campaign !== "string" || !UUID_RE.test(campaign))) {
    return fail("הקמפיין לא נמצא", 404);
  }
  return {
    file: { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    mapping,
    campaign: campaign as string | null,
  };
}

// User-facing errors keep their Hebrew message; anything else is logged
// without file content (ARCHITECTURE.md 6.5, 8.2)
export function errorResponse(error: unknown, action: string): Response {
  if (error instanceof ImportFileError || error instanceof ImportInputError) return fail(error.message, 422);
  console.error(`import ${action} failed`, { code: (error as { code?: string }).code });
  return fail(action === "commit" ? "הייבוא נכשל ולא נשמרו נתונים. נסה שוב." : GENERIC_MESSAGE, 500);
}
