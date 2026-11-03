import { denyUnlessOnboarded } from "@/server/import/http";
import { buildTemplate, TEMPLATE_FILE_NAME } from "@/server/import/template";

// Download of the Budgi sample file
export async function GET() {
  const denied = await denyUnlessOnboarded();
  if (denied) return denied;

  return new Response(Buffer.from(buildTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILE_NAME}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
