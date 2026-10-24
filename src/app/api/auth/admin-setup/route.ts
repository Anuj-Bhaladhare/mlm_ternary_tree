import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api-response";
import { bootstrapAdministrator } from "@/server/auth/account-service";

const setupSchema = z
  .object({
    identifier: z.string().trim().min(3).max(254),
    setupToken: z.string().min(32).max(512),
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
    const parsed = setupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Review the setup details and try again.",
        requestId,
      );
    }

    await bootstrapAdministrator(parsed.data);
    return Response.json(
      { data: { initialized: true } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
