import { handleApiError } from "@/lib/api-response";
import { getAdministratorBootstrapStatus } from "@/server/auth/account-service";

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const data = await getAdministratorBootstrapStatus();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
