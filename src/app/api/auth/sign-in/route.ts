import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { jsonError } from "@/lib/api-response";
import { resolveLoginEmail } from "@/server/auth/account-service";
import { auth } from "@/server/auth/auth";

const signInSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(true),
});

function invalidCredentials(requestId: string) {
  return jsonError(
    401,
    "INVALID_CREDENTIALS",
    "Invalid email, member ID, or password.",
    requestId,
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return invalidCredentials(requestId);
  }

  const email = await resolveLoginEmail(parsed.data.identifier);
  if (!email) {
    // Keep unknown identifier failures close to credential-account failures.
    await hashPassword(parsed.data.password);
    return invalidCredentials(requestId);
  }

  const result = await auth.api.signInEmail({
    headers: request.headers,
    body: {
      email,
      password: parsed.data.password,
      rememberMe: parsed.data.rememberMe,
    },
    asResponse: true,
  });

  if (!result.ok) {
    return invalidCredentials(requestId);
  }

  return result;
}
