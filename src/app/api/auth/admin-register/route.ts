import { jsonError } from "@/lib/api-response";
import { adminRegistrationSchema } from "@/modules/auth/rules";
import { auth } from "@/server/auth/auth";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let body: unknown;

  try {
    body = await request.json();

    console.log("BODYYYYY", body);

  } catch {
    return jsonError(
      400,
      "INVALID_JSON",
      "The request body must contain valid JSON.",
      requestId,
    );
  }

  const parsed = adminRegistrationSchema.safeParse(body);
  console.log("parsed: ", parsed);

  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Review the registration details and try again.",
      requestId,
      parsed.error.issues.map(({ path, message }) => ({
        field: path.join("."),
        message,
      })),
    );
  }

  return auth.api.registerAdministrator({
    headers: request.headers,
    body: parsed.data,
    asResponse: true,
  });
  
}