import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api-response";
import { issueMemberSetupToken } from "@/server/auth/account-service";
import { requirePermission } from "@/server/auth/permissions";

const memberIdSchema = z.uuid();

export async function POST(
  request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const requestId = crypto.randomUUID();

  try {
    const actor = await requirePermission("admin.members.manage", request.headers);
    const memberId = memberIdSchema.safeParse((await context.params).memberId);
    if (!memberId.success) {
      return jsonError(400, "INVALID_MEMBER_ID", "Invalid member identifier.", requestId);
    }

    const result = await issueMemberSetupToken(
      memberId.data,
      actor.id,
      "PASSWORD_RESET",
    );
    const resetUrl = `${new URL("/reset", request.url).toString()}#token=${encodeURIComponent(result.token)}`;

    return Response.json(
      { data: { resetUrl, expiresAt: result.expiresAt } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
