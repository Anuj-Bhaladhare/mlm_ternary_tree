import { describe, expect, it } from "vitest";
import {
  AccessError,
  hasPermission,
  permissionCodes,
} from "./permissions";

describe("permissions logic", () => {
  it("defines core permission catalog items", () => {
    expect(permissionCodes).toContain("dashboard:read");
    expect(permissionCodes).toContain("admin.members.read");
    expect(permissionCodes).toContain("admin.members.create");
    expect(permissionCodes).toContain("admin.genealogy.view");
  });

  it("checks granted permissions correctly with hasPermission", () => {
    const userGrants = ["dashboard:read", "admin.members.read"];

    expect(hasPermission(userGrants, "dashboard:read")).toBe(true);
    expect(hasPermission(userGrants, "admin.members.read")).toBe(true);
    expect(hasPermission(userGrants, "admin.members.create")).toBe(false);
    expect(hasPermission(userGrants, "admin.genealogy.view")).toBe(false);
  });

  it("denies access when permission list is empty", () => {
    expect(hasPermission([], "dashboard:read")).toBe(false);
  });

  it("constructs AccessError with proper HTTP status and error codes", () => {
    const unauthenticated = new AccessError(
      401,
      "UNAUTHENTICATED",
      "Sign in required.",
    );
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.code).toBe("UNAUTHENTICATED");
    expect(unauthenticated.message).toBe("Sign in required.");
    expect(unauthenticated.name).toBe("AccessError");

    const forbidden = new AccessError(
      403,
      "FORBIDDEN",
      "You do not have permission.",
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.code).toBe("FORBIDDEN");
  });
});
