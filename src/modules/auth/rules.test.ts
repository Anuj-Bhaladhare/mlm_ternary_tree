import { describe, expect, it } from "vitest";
import { adminRegistrationSchema } from "./rules";

const validRegistration = {
  email: " Admin@example.com ",
  password: "long-secure-admin-password",
  confirmPassword: "long-secure-admin-password",
  secretKey: "configured-server-secret-key",
};

describe("adminRegistrationSchema", () => {
  it("normalizes email and accepts valid registration fields", () => {
    expect(adminRegistrationSchema.parse(validRegistration)).toEqual({
      ...validRegistration,
      email: "admin@example.com",
    });
  });

  it("rejects mismatched passwords and client-supplied roles", () => {
    expect(
      adminRegistrationSchema.safeParse({
        ...validRegistration,
        confirmPassword: "a-different-password",
      }).success,
    ).toBe(false);

    expect(
      adminRegistrationSchema.safeParse({
        ...validRegistration,
        role: "administrator",
      }).success,
    ).toBe(false);
  });

  it("enforces the application password length policy", () => {
    expect(
      adminRegistrationSchema.safeParse({
        ...validRegistration,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });
});
