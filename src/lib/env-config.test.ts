import { describe, expect, it } from "vitest";
import { getAdminCreationKey, getConfiguredAdminEnv } from "./env-config";

describe("configured administrator environment", () => {
  it("returns null when startup provisioning is not configured", () => {
    expect(getConfiguredAdminEnv({})).toBeNull();
  });

  describe("administrator creation key configuration", () => {
    it("accepts a configured key with at least 16 characters", () => {
      expect(
        getAdminCreationKey({
          ADMIN_CREATION_KEY: "a-random-secret-key-12345",
        }),
      ).toBe("a-random-secret-key-12345");
    });

    it("rejects missing or short keys without returning key contents", () => {
      expect(() => getAdminCreationKey({})).toThrow(
        /at least 16 characters/,
      );
      expect(() =>
        getAdminCreationKey({ ADMIN_CREATION_KEY: "short" }),
      ).toThrow(/at least 16 characters/);
    });
  });

  it("normalizes the configured email", () => {
    expect(
      getConfiguredAdminEnv({
        APP_ADMIN_USER: "  ADMIN@example.com ",
        APP_ADMIN_PASSWORD: "a-safe-password-with-12-chars",
      }),
    ).toEqual({
      email: "admin@example.com",
      password: "a-safe-password-with-12-chars",
    });
  });

  it("rejects incomplete or invalid credentials without exposing values", () => {
    const password = "short";

    expect(() =>
      getConfiguredAdminEnv({
        APP_ADMIN_USER: "admin@example.com",
      }),
    ).toThrow(/APP_ADMIN_USER and APP_ADMIN_PASSWORD/);

    expect(() =>
      getConfiguredAdminEnv({
        APP_ADMIN_USER: "admin@example.com",
        APP_ADMIN_PASSWORD: password,
      }),
    ).toThrow(/12–128 character password/);
  });
});
