import { describe, expect, it } from "vitest";
import { createMemberSchema, resolvePlacement } from "./rules";

describe("resolvePlacement", () => {
  it("creates a root placement when no parent or position is supplied", () => {
    expect(resolvePlacement(null, null)).toEqual({
      parentId: null,
      position: null,
      isRoot: true,
    });
  });

  it("accepts a placed member when both parent and position are present", () => {
    const parentId = "0d64f420-9af3-475a-8d5a-f58d7ef867d2";
    for (const position of ["LEFT", "MIDDLE", "RIGHT"] as const) {
      expect(resolvePlacement(parentId, position)).toEqual({
        parentId,
        position,
        isRoot: false,
      });
    }
  });

  it("rejects partial placement data when parent is missing but position is set", () => {
    expect(() => resolvePlacement(null, "LEFT")).toThrow(
      "A placement must specify both a parent and a LEFT, MIDDLE, or RIGHT position.",
    );
  });

  it("rejects partial placement data when position is missing but parent is set", () => {
    expect(() =>
      resolvePlacement("0d64f420-9af3-475a-8d5a-f58d7ef867d2", null),
    ).toThrow(
      "A placement must specify both a parent and a LEFT, MIDDLE, or RIGHT position.",
    );
  });
});

describe("createMemberSchema", () => {
  it("normalizes member data and converts empty values to null", () => {
    expect(
      createMemberSchema.parse({
        memberCode: "  ab12-9 ",
        name: " Jane Doe ",
        email: "",
        sponsorId: "",
        parentId: "",
        position: "",
      }),
    ).toEqual({
      memberCode: "AB12-9",
      name: "Jane Doe",
      email: null,
      sponsorId: null,
      parentId: null,
      position: null,
    });
  });

  it("requires both parent and position together when parent is provided", () => {
    const result = createMemberSchema.safeParse({
      memberCode: "M001",
      name: "Jane Doe",
      parentId: "0d64f420-9af3-475a-8d5a-f58d7ef867d2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["position"]);
    }
  });

  it("requires both parent and position together when position is provided without parent", () => {
    const result = createMemberSchema.safeParse({
      memberCode: "M001",
      name: "Jane Doe",
      position: "LEFT",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["position"]);
    }
  });

  it("rejects invalid member codes with special characters or invalid format", () => {
    const invalidCodes = ["@M1", "M 123", "-M100", "AB"];
    for (const memberCode of invalidCodes) {
      const result = createMemberSchema.safeParse({
        memberCode,
        name: "Jane Doe",
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects invalid email addresses", () => {
    const result = createMemberSchema.safeParse({
      memberCode: "M1001",
      name: "Jane Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUIDs for parentId or sponsorId", () => {
    const result = createMemberSchema.safeParse({
      memberCode: "M1001",
      name: "Jane Doe",
      parentId: "not-a-uuid",
      position: "LEFT",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid non-root member input", () => {
    const validData = {
      memberCode: "member_01",
      name: "John Smith",
      email: "john@example.com",
      parentId: "0d64f420-9af3-475a-8d5a-f58d7ef867d2",
      sponsorId: "1d64f420-9af3-475a-8d5a-f58d7ef867d2",
      position: "RIGHT" as const,
    };
    const parsed = createMemberSchema.parse(validData);
    expect(parsed.memberCode).toBe("MEMBER_01");
    expect(parsed.name).toBe("John Smith");
    expect(parsed.email).toBe("john@example.com");
    expect(parsed.position).toBe("RIGHT");
    expect(parsed.parentId).toBe("0d64f420-9af3-475a-8d5a-f58d7ef867d2");
    expect(parsed.sponsorId).toBe("1d64f420-9af3-475a-8d5a-f58d7ef867d2");
  });

  it("accepts all three ternary positions", () => {
    const parentId = "0d64f420-9af3-475a-8d5a-f58d7ef867d2";

    for (const position of ["LEFT", "MIDDLE", "RIGHT"] as const) {
      const parsed = createMemberSchema.parse({
        memberCode: "M1001",
        name: "Jane Doe",
        parentId,
        position,
      });

      expect(parsed.position).toBe(position);
    }
  });
});
