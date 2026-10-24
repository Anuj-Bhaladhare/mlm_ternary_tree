import "server-only";

import { and, eq, ilike, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { db } from "@/server/db";
import type * as schema from "@/server/db/schema";
import {
  accountSetupTokens,
  accounts,
  auditLogs,
  idempotencyKeys,
  members,
  roles,
  userRoles,
  users,
} from "@/server/db/schema";
import { createOneTimeToken, hashIdempotencyPayload } from "@/server/auth/tokens";
import type { CreateMemberInput } from "./rules";
import { resolvePlacement } from "./rules";

export class MemberDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PLACEMENT"
      | "POSITION_OCCUPIED"
      | "ROOT_ALREADY_EXISTS"
      | "MEMBER_CODE_TAKEN"
      | "MEMBER_EMAIL_TAKEN"
      | "PARENT_NOT_FOUND"
      | "SPONSOR_NOT_FOUND"
      | "IDEMPOTENCY_KEY_REUSED",
    message: string,
  ) {
    super(message);
    this.name = "MemberDomainError";
  }
}

function getConstraintName(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const databaseError = error as { code?: unknown; constraint_name?: unknown };

  if (databaseError.code !== "23505") {
    return undefined;
  }

  return typeof databaseError.constraint_name === "string"
    ? databaseError.constraint_name
    : undefined;
}

function mapUniqueConstraint(error: unknown): MemberDomainError | undefined {
  switch (getConstraintName(error)) {
    case "members_parent_position_unique":
      return new MemberDomainError(
        "POSITION_OCCUPIED",
        "The selected ternary-tree position is already occupied.",
      );
    case "members_single_root_unique":
      return new MemberDomainError(
        "ROOT_ALREADY_EXISTS",
        "The ternary tree already has a root member.",
      );
    case "members_member_code_unique":
    case "user_login_id_unique":
      return new MemberDomainError(
        "MEMBER_CODE_TAKEN",
        "A member already uses that member code.",
      );
    case "members_email_unique":
    case "user_email_unique":
      return new MemberDomainError(
        "MEMBER_EMAIL_TAKEN",
        "A member already uses that email address.",
      );
    default:
      return undefined;
  }
}

const accountSetupTokenLifetimeMs = 24 * 60 * 60 * 1000;

async function ensurePlacementIsAvailable(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: CreateMemberInput,
) {
  const placement = resolvePlacement(input.parentId, input.position);

  if (placement.isRoot) {
    const [root] = await tx
      .select({ id: members.id })
      .from(members)
      .where(eq(members.isRoot, true))
      .limit(1);

    if (root) {
      throw new MemberDomainError(
        "ROOT_ALREADY_EXISTS",
        "The ternary tree already has a root member.",
      );
    }
  } else {
    const [parent] = await tx
      .select({ id: members.id })
      .from(members)
      .where(eq(members.id, placement.parentId))
      .for("update")
      .limit(1);

    if (!parent) {
      throw new MemberDomainError(
        "PARENT_NOT_FOUND",
        "The selected parent member does not exist.",
      );
    }

    const [occupiedPosition] = await tx
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.parentId, placement.parentId),
          eq(members.position, placement.position),
        ),
      )
      .limit(1);

    if (occupiedPosition) {
      throw new MemberDomainError(
        "POSITION_OCCUPIED",
        "The selected ternary-tree position is already occupied.",
      );
    }
  }

  if (input.sponsorId) {
    const [sponsor] = await tx
      .select({ id: members.id })
      .from(members)
      .where(eq(members.id, input.sponsorId))
      .limit(1);

    if (!sponsor) {
      throw new MemberDomainError(
        "SPONSOR_NOT_FOUND",
        "The selected sponsor member does not exist.",
      );
    }
  }

  return placement;
}

export async function createMember(input: CreateMemberInput, actorId: string) {
  try {
    return await db.transaction(async (tx) => {
      const placement = await ensurePlacementIsAvailable(tx, input);

      const [member] = await tx
        .insert(members)
        .values({
          memberCode: input.memberCode,
          name: input.name,
          email: input.email,
          sponsorId: input.sponsorId,
          parentId: placement.parentId,
          position: placement.position,
          isRoot: placement.isRoot,
          createdBy: actorId,
        })
        .returning({
          id: members.id,
          memberCode: members.memberCode,
          name: members.name,
          email: members.email,
          sponsorId: members.sponsorId,
          parentId: members.parentId,
          position: members.position,
          isRoot: members.isRoot,
          status: members.status,
          createdAt: members.createdAt,
        });

      await tx.insert(auditLogs).values({
        actorId,
        action: "member.created",
        resourceType: "member",
        resourceId: member.id,
        outcome: "success",
        metadata: {
          memberCode: member.memberCode,
          sponsorId: member.sponsorId ?? "",
          parentId: member.parentId ?? "",
          position: member.position ?? "",
        },
      });

      return member;
    });
  } catch (error) {
    const mappedError = mapUniqueConstraint(error);
    if (mappedError) {
      throw mappedError;
    }
    throw error;
  }
}

/**
 * Provisions the authentication user, pending member, ternary placement,
 * initial setup credential, audit record, and idempotency record as one
 * PostgreSQL transaction. Raw setup tokens only exist in the returned value;
 * their SHA-256 digest is what is persisted.
 */
export async function createMemberAccount(
  input: CreateMemberInput,
  actorId: string,
  idempotencyKey: string,
  requestId: string,
) {
  const payloadHash = hashIdempotencyPayload(input);
  const { token, tokenHash } = createOneTimeToken();
  const expiresAt = new Date(Date.now() + accountSetupTokenLifetimeMs);

  try {
    return await db.transaction(async (tx) => {
      const [reservation] = await tx
        .insert(idempotencyKeys)
        .values({
          actorId,
          scope: "admin.members.create",
          key: idempotencyKey,
          payloadHash,
        })
        .onConflictDoNothing()
        .returning({ id: idempotencyKeys.id });

      if (!reservation) {
        const [existing] = await tx
          .select({
            payloadHash: idempotencyKeys.payloadHash,
            memberId: idempotencyKeys.memberId,
          })
          .from(idempotencyKeys)
          .where(
            and(
              eq(idempotencyKeys.actorId, actorId),
              eq(idempotencyKeys.scope, "admin.members.create"),
              eq(idempotencyKeys.key, idempotencyKey),
            ),
          )
          .limit(1);

        if (!existing || existing.payloadHash !== payloadHash || !existing.memberId) {
          throw new MemberDomainError(
            "IDEMPOTENCY_KEY_REUSED",
            "This idempotency key cannot be used for a different request.",
          );
        }

        const [existingMember] = await tx
          .select({
            id: members.id,
            memberCode: members.memberCode,
            name: members.name,
            email: members.email,
            sponsorId: members.sponsorId,
            parentId: members.parentId,
            position: members.position,
            isRoot: members.isRoot,
            status: members.status,
            createdAt: members.createdAt,
          })
          .from(members)
          .where(eq(members.id, existing.memberId))
          .limit(1);

        if (!existingMember) {
          throw new MemberDomainError(
            "IDEMPOTENCY_KEY_REUSED",
            "The original creation request is no longer available.",
          );
        }

        return { member: existingMember, setupToken: null, replayed: true };
      }

      const placement = await ensurePlacementIsAvailable(tx, input);
      const userId = crypto.randomUUID();

      await tx.insert(users).values({
        id: userId,
        name: input.name,
        email: input.email,
        loginId: input.memberCode,
        isActive: true,
      });

      const [memberRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.code, "member"))
        .limit(1);

      if (!memberRole) {
        throw new Error(
          'The "member" role is missing. Run `npm run db:seed` before creating members.',
        );
      }

      await tx.insert(userRoles).values({ userId, roleId: memberRole.id });

      await tx.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: null,
      });

      const [member] = await tx
        .insert(members)
        .values({
          memberCode: input.memberCode,
          name: input.name,
          email: input.email,
          userId,
          sponsorId: input.sponsorId,
          parentId: placement.parentId,
          position: placement.position,
          isRoot: placement.isRoot,
          status: "PENDING",
          createdBy: actorId,
        })
        .returning({
          id: members.id,
          memberCode: members.memberCode,
          name: members.name,
          email: members.email,
          sponsorId: members.sponsorId,
          parentId: members.parentId,
          position: members.position,
          isRoot: members.isRoot,
          status: members.status,
          createdAt: members.createdAt,
        });

      await tx.insert(accountSetupTokens).values({
        userId,
        tokenHash,
        purpose: "INITIAL_SETUP",
        expiresAt,
        createdBy: actorId,
      });

      await tx
        .update(idempotencyKeys)
        .set({ memberId: member.id })
        .where(eq(idempotencyKeys.id, reservation.id));

      await tx.insert(auditLogs).values({
        actorId,
        action: "admin.member.created",
        resourceType: "member",
        resourceId: member.id,
        outcome: "success",
        metadata: {
          requestId,
          memberCode: member.memberCode,
          sponsorId: member.sponsorId ?? "",
          parentId: member.parentId ?? "",
          position: member.position ?? "",
        },
      });

      return { member, setupToken: token, replayed: false };
    });
  } catch (error) {
    const mappedError = mapUniqueConstraint(error);
    if (mappedError) {
      throw mappedError;
    }
    throw error;
  }
}

const memberSearchColumns = [members.memberCode, members.name, members.email] as const;

export async function listMembers(search: string, limit: number, offset: number) {
  const where = search
    ? sql`(${ilike(memberSearchColumns[0], `%${search}%`)} OR ${ilike(memberSearchColumns[1], `%${search}%`)} OR ${ilike(memberSearchColumns[2], `%${search}%`)})`
    : undefined;

  return db
    .select({
      id: members.id,
      memberCode: members.memberCode,
      name: members.name,
      email: members.email,
      userId: members.userId,
      sponsorId: members.sponsorId,
      parentId: members.parentId,
      position: members.position,
      isRoot: members.isRoot,
      status: members.status,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(where)
    .orderBy(members.createdAt, members.id)
    .limit(limit)
    .offset(offset);
}

export async function getMemberCounts() {
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(members);

  return rows[0]?.total ?? 0;
}

export async function getRootWithChildren() {
  const [root] = await db
    .select({
      id: members.id,
      memberCode: members.memberCode,
      name: members.name,
      status: members.status,
    })
    .from(members)
    .where(eq(members.isRoot, true))
    .limit(1);

  if (!root) {
    return null;
  }

  const children = await db
    .select({
      id: members.id,
      memberCode: members.memberCode,
      name: members.name,
      position: members.position,
      status: members.status,
    })
    .from(members)
    .where(eq(members.parentId, root.id))
    .orderBy(members.position);

  return { ...root, children };
}

export async function getMemberSubtreeStats(memberId: string) {
  const result = await db.execute<{
    left_count: number;
    middle_count: number;
    right_count: number;
  }>(sql`
    WITH RECURSIVE descendants AS (
      SELECT id, position AS branch
      FROM members
      WHERE parent_id = ${memberId}
      UNION ALL
      SELECT m.id, d.branch
      FROM members m
      INNER JOIN descendants d ON m.parent_id = d.id
    )
    SELECT
      count(*) FILTER (WHERE branch = 'LEFT')::int AS left_count,
      count(*) FILTER (WHERE branch = 'MIDDLE')::int AS middle_count,
      count(*) FILTER (WHERE branch = 'RIGHT')::int AS right_count
    FROM descendants;
  `);

  const leftCount = Number(result[0]?.left_count ?? 0);
  const middleCount = Number(result[0]?.middle_count ?? 0);
  const rightCount = Number(result[0]?.right_count ?? 0);

  return {
    leftCount,
    middleCount,
    rightCount,
    totalDescendants: leftCount + middleCount + rightCount,
  };
}

export async function getDashboardStats() {
  const counts = await db.execute<{
    total: number;
    active: number;
    pending: number;
    suspended: number;
  }>(sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
      count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
      count(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended
    FROM members;
  `);

  const [root] = await db
    .select({
      id: members.id,
      memberCode: members.memberCode,
      name: members.name,
      status: members.status,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(eq(members.isRoot, true))
    .limit(1);

  let rootStats = {
    leftCount: 0,
    middleCount: 0,
    rightCount: 0,
    totalDescendants: 0,
  };
  if (root) {
    rootStats = await getMemberSubtreeStats(root.id);
  }

  return {
    totalMembers: Number(counts[0]?.total ?? 0),
    activeMembers: Number(counts[0]?.active ?? 0),
    pendingMembers: Number(counts[0]?.pending ?? 0),
    suspendedMembers: Number(counts[0]?.suspended ?? 0),
    rootMember: root ?? null,
    rootStats,
  };
}

export type TreeNode = {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  parentId: string | null;
  position: "LEFT" | "MIDDLE" | "RIGHT" | null;
  isRoot: boolean;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  depth: number;
  leftCount?: number;
  middleCount?: number;
  rightCount?: number;
  leftChild: TreeNode | null;
  middleChild: TreeNode | null;
  rightChild: TreeNode | null;
};

export async function getGenealogyTree(identifier?: string, maxDepth = 3): Promise<TreeNode | null> {
  let rootId: string | null = null;

  if (identifier && identifier.trim()) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier.trim());
    const [target] = await db
      .select({ id: members.id })
      .from(members)
      .where(isUuid ? eq(members.id, identifier.trim()) : eq(members.memberCode, identifier.trim().toUpperCase()))
      .limit(1);

    if (!target) {
      return null;
    }
    rootId = target.id;
  } else {
    const [root] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.isRoot, true))
      .limit(1);

    if (!root) {
      return null;
    }
    rootId = root.id;
  }

  const rows = await db.execute<{
    id: string;
    member_code: string;
    name: string;
    email: string | null;
    parent_id: string | null;
    position: "LEFT" | "MIDDLE" | "RIGHT" | null;
    is_root: boolean;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    created_at: string;
    depth: number;
  }>(sql`
    WITH RECURSIVE tree AS (
      SELECT
        id, member_code, name, email, parent_id, position, is_root, status, created_at, 0 AS depth
      FROM members
      WHERE id = ${rootId}
      UNION ALL
      SELECT
        m.id, m.member_code, m.name, m.email, m.parent_id, m.position, m.is_root, m.status, m.created_at, t.depth + 1
      FROM members m
      INNER JOIN tree t ON m.parent_id = t.id
      WHERE t.depth < ${maxDepth}
    )
    SELECT * FROM tree ORDER BY depth, position NULLS FIRST;
  `);

  if (!rows || rows.length === 0) {
    return null;
  }

  const nodeMap = new Map<string, TreeNode>();
  for (const row of rows) {
    nodeMap.set(row.id, {
      id: row.id,
      memberCode: row.member_code,
      name: row.name,
      email: row.email,
      parentId: row.parent_id,
      position: row.position,
      isRoot: row.is_root,
      status: row.status,
      createdAt: new Date(row.created_at),
      depth: Number(row.depth),
      leftChild: null,
      middleChild: null,
      rightChild: null,
    });
  }

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      if (node.position === "LEFT") {
        parent.leftChild = node;
      } else if (node.position === "MIDDLE") {
        parent.middleChild = node;
      } else if (node.position === "RIGHT") {
        parent.rightChild = node;
      }
    }
  }

  const rootNode = nodeMap.get(rootId)!;
  const stats = await getMemberSubtreeStats(rootId);
  rootNode.leftCount = stats.leftCount;
  rootNode.middleCount = stats.middleCount;
  rootNode.rightCount = stats.rightCount;

  return rootNode;
}

export async function getMemberByCodeOrId(identifier: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier.trim());

  const [row] = await db
    .select({
      id: members.id,
      memberCode: members.memberCode,
      name: members.name,
      email: members.email,
      sponsorId: members.sponsorId,
      parentId: members.parentId,
      position: members.position,
      isRoot: members.isRoot,
      status: members.status,
      createdAt: members.createdAt,
      updatedAt: members.updatedAt,
    })
    .from(members)
    .where(isUuid ? eq(members.id, identifier.trim()) : eq(members.memberCode, identifier.trim().toUpperCase()))
    .limit(1);

  if (!row) {
    return null;
  }

  let sponsor: { id: string; memberCode: string; name: string } | null = null;
  if (row.sponsorId) {
    const [s] = await db
      .select({ id: members.id, memberCode: members.memberCode, name: members.name })
      .from(members)
      .where(eq(members.id, row.sponsorId))
      .limit(1);
    sponsor = s ?? null;
  }

  let parent: { id: string; memberCode: string; name: string } | null = null;
  if (row.parentId) {
    const [p] = await db
      .select({ id: members.id, memberCode: members.memberCode, name: members.name })
      .from(members)
      .where(eq(members.id, row.parentId))
      .limit(1);
    parent = p ?? null;
  }

  const stats = await getMemberSubtreeStats(row.id);

  return {
    ...row,
    sponsor,
    parent,
    stats,
  };
}

export type MemberDatabase = PostgresJsDatabase<typeof schema>;
