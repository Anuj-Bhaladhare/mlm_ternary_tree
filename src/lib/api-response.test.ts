import { describe, expect, it } from "vitest";
import { AdminBootstrapConfigurationError } from "./env-config";
import { handleApiError } from "./api-response";

describe("handleApiError", () => {
  it("reports missing administrator bootstrap settings as service unavailable", async () => {
    const response = handleApiError(
      new AdminBootstrapConfigurationError(),
      "request-123",
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "ADMIN_BOOTSTRAP_NOT_CONFIGURED",
        message:
          "Administrator setup is unavailable until the server bootstrap settings are configured.",
        requestId: "request-123",
      },
    });
  });
});
