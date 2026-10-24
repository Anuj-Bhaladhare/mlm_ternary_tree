import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api-response";
import { createMemberSchema } from "@/modules/members/rules";
import { createMemberAccount, listMembers } from "@/modules/members/service";
import { requirePermission } from "@/server/auth/permissions";

const listQuerySchema = z.object({
  q: z.string().trim().max(64).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const idempotencyKeySchema = z.string().trim().min(8).max(255);

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    await requirePermission("admin.members.read", request.headers);
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      return jsonError(
        400,
        "INVALID_QUERY",
        "The member search parameters are invalid.",
        requestId,
      );
    }

    const data = await listMembers(
      parsed.data.q,
      parsed.data.limit,
      parsed.data.offset,
    );
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const actor = await requirePermission("admin.members.create", request.headers);
    const key = idempotencyKeySchema.safeParse(
      request.headers.get("idempotency-key"),
    );
    if (!key.success) {
      return jsonError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "An Idempotency-Key header is required for member creation.",
        requestId,
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 16_384) {
      return jsonError(
        413,
        "REQUEST_TOO_LARGE",
        "The request body is too large.",
        requestId,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        400,
        "INVALID_JSON",
        "The request body must contain valid JSON.",
        requestId,
      );
    }

    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Review the member details and try again.",
        requestId,
        parsed.error.issues.map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      );
    }

    const result = await createMemberAccount(
      parsed.data,
      actor.id,
      key.data,
      requestId,
    );
    const activationUrl = result.setupToken
      ? `${new URL("/activate", request.url).toString()}#token=${encodeURIComponent(result.setupToken)}`
      : null;

    return Response.json(
      {
        data: {
          member: result.member,
          activationUrl,
          activationExpiresInHours: result.setupToken ? 24 : null,
          replayed: result.replayed,
        },
      },
      {
        status: result.replayed ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
