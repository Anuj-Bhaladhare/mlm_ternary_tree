import { z } from "zod";

export const placementPositions = ["LEFT", "MIDDLE", "RIGHT"] as const;
export type PlacementPosition = (typeof placementPositions)[number];
export const manageableMemberStatuses = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
] as const;

export const createMemberSchema = z
  .object({
    memberCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(32)
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/),
    name: z.string().trim().min(2).max(120),
    // Every newly provisioned member receives an authentication account, so an
    // email is required even though older imported member rows may be empty.
    email: z.email().transform((value) => value.trim().toLowerCase()),
    sponsorId: z.union([z.uuid(), z.literal("")]).optional(),
    parentId: z.union([z.uuid(), z.literal("")]).optional(),
    position: z.union([z.enum(placementPositions), z.literal("")]).optional(),
  })
  .superRefine((member, context) => {
    const hasParent = Boolean(member.parentId);
    const hasPosition = Boolean(member.position);

    if (hasParent !== hasPosition) {
      context.addIssue({
        code: "custom",
        path: ["position"],
        message:
          "Choose both a parent and a LEFT, MIDDLE, or RIGHT position, or leave both empty to create the single root.",
      });
    }
  })
  .transform((member) => ({
    memberCode: member.memberCode,
    name: member.name,
    email: member.email,
    sponsorId: member.sponsorId || null,
    parentId: member.parentId || null,
    position: member.position || null,
  }));

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().transform((value) => value.trim().toLowerCase()),
    status: z.enum(manageableMemberStatuses),
  })
  .strict();

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export function resolvePlacement(
  parentId: string | null,
  position: PlacementPosition | null,
) {
  if (parentId === null && position === null) {
    return { parentId: null, position: null, isRoot: true } as const;
  }

  if (parentId === null || position === null) {
    throw new TypeError(
      "A placement must specify both a parent and a LEFT, MIDDLE, or RIGHT position.",
    );
  }

  return { parentId, position, isRoot: false } as const;
}
