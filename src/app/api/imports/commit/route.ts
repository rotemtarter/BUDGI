import { getCurrentUser } from "@/server/auth/session";
import { denyUnlessOnboarded, errorResponse, fail, ok, readUpload } from "@/server/import/http";
import { checkAlerts } from "@/server/services/alerts-check";
import { commitCampaignImport, commitImport, MAPPING_MESSAGE } from "@/server/services/imports";

// Saves the valid rows and creates the new campaigns, after the user confirmed.
// Then checks the alerts (ARCHITECTURE.md 5.2, step 8).
export async function POST(request: Request) {
  const denied = await denyUnlessOnboarded();
  if (denied) return denied;
  const upload = await readUpload(request);
  if (upload instanceof Response) return upload;
  if (upload.mapping === undefined) return fail(MAPPING_MESSAGE, 422);

  try {
    const result = upload.campaign
      ? await commitCampaignImport(upload.file, upload.campaign, upload.mapping)
      : await commitImport(upload.file, upload.mapping);
    const user = await getCurrentUser();
    const alerts = user ? await checkAlerts(user.id) : [];
    return ok({ result, alerts });
  } catch (error) {
    return errorResponse(error, "commit");
  }
}
