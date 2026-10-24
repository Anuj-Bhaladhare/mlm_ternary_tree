import { NextResponse } from "next/server";
import { AccessError } from "@/server/auth/permissions";
import { AccountDomainError } from "@/server/auth/account-service";
import { MemberDomainError } from "@/modules/members/service";

export function jsonError(
  status: number,
  code: string,
  message: string,
  requestId = crypto.randomUUID(),
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

export function handleApiError(error: unknown, requestId: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  ) {
    throw error;
  }

  if (error instanceof AccessError) {
    return jsonError(error.status, error.code, error.message, requestId);
  }

  if (error instanceof MemberDomainError) {
    const status = error.code.endsWith("_NOT_FOUND")
      ? 404
      : error.code === "POSITION_OCCUPIED" ||
          error.code === "ROOT_ALREADY_EXISTS" ||
          error.code.endsWith("_TAKEN")
        ? 409
        : 400;

    return jsonError(status, error.code, error.message, requestId);
  }

  if (error instanceof AccountDomainError) {
    const status =
      error.code === "MEMBER_NOT_FOUND"
        ? 404
        : error.code === "ADMIN_EMAIL_TAKEN"
          ? 409
        : error.code === "ACCOUNT_EMAIL_TAKEN" ||
            error.code === "ADMIN_ALREADY_INITIALIZED" ||
            error.code === "ADMIN_IDENTITY_CONFLICT" ||
            error.code === "PASSWORD_SETUP_REQUIRED"
          ? 409
          : error.code === "INVALID_OR_EXPIRED_TOKEN" ||
              error.code === "ADMIN_BOOTSTRAP_UNAVAILABLE"
            ? 400
            : 422;

    return jsonError(status, error.code, error.message, requestId);
  }

  console.error("Unexpected API failure.", { requestId, error });
  return jsonError(
    500,
    "INTERNAL_ERROR",
    "The request could not be completed.",
    requestId,
  );
}
