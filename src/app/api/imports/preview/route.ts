import { denyUnlessOnboarded, errorResponse, readUpload } from "@/server/import/http";
import { previewCampaignImport, previewImport } from "@/server/services/imports";

// Parses the file and returns the column mapping and/or the preview. Writes nothing.
export async function POST(request: Request) {
  const denied = await denyUnlessOnboarded();
  if (denied) return denied;
  const upload = await readUpload(request);
  if (upload instanceof Response) return upload;

  try {
    const result = upload.campaign
      ? await previewCampaignImport(upload.file, upload.campaign, upload.mapping)
      : await previewImport(upload.file, upload.mapping);
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error, "preview");
  }
}
