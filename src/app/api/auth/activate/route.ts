import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api-response";
import { consumeMemberSetupToken } from "@/server/auth/account-service";

const passwordSetupSchema = z
  .object({
    token: z.string().min(32).max(512),
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const parsed = passwordSetupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Review the password details and try again.",
        requestId,
      );
    }
    await consumeMemberSetupToken(parsed.data);
    return Response.json(
      { data: { activated: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
