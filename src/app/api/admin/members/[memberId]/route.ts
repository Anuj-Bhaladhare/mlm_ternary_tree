import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api-response";
import { updateMemberSchema } from "@/modules/members/rules";
import { updateMemberAccount } from "@/server/auth/account-service";
import { requirePermission } from "@/server/auth/permissions";

const memberIdSchema = z.uuid();

export async function PATCH(
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

    const body = updateMemberSchema.safeParse(await request.json());
    if (!body.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Review the member details and try again.",
        requestId,
      );
    }

    const member = await updateMemberAccount(memberId.data, body.data, actor.id);
    return Response.json(
      { data: member },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
