import { z } from "zod";
import { jsonError, handleApiError } from "@/lib/api-response";
import { listMembers } from "@/modules/members/service";
import { requirePermission } from "@/server/auth/permissions";

const memberListQuerySchema = z.object({
  q: z.string().trim().max(64).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    await requirePermission("admin.members.read", request.headers);

    const query = memberListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) {
      return jsonError(
        400,
        "INVALID_QUERY",
        "The member search parameters are invalid.",
        requestId,
        query.error.issues.map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      );
    }

    const data = await listMembers(
      query.data.q,
      query.data.limit,
      query.data.offset,
    );

    return Response.json({
      data,
      pagination: {
        limit: query.data.limit,
        offset: query.data.offset,
        hasMore: data.length === query.data.limit,
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  void request;
  return jsonError(
    410,
    "ADMIN_ENDPOINT_REQUIRED",
    "Create members through /api/admin/members so account provisioning and idempotency are enforced.",
    requestId,
  );
}
