import "server-only";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/server/db";
import { permissions, rolePermissions, roles, userRoles } from "@/server/db/schema";
import { isUserEligibleForSession } from "./account-service";

export const permissionCodes = [
  "dashboard:read",
  "admin.members.read",
  "admin.members.create",
  "admin.members.manage",
  "admin.genealogy.view",
] as const;

export type PermissionCode = (typeof permissionCodes)[number];

export function hasPermission(
  grantedPermissions: readonly string[],
  requiredPermission: PermissionCode,
) {
  return grantedPermissions.includes(requiredPermission);
}

export class AccessError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export async function getCurrentSession(requestHeaders?: Headers) {
  const resolvedHeaders = requestHeaders ?? (await headers());
  const session = await auth.api.getSession({ headers: resolvedHeaders });

  if (!session || !(await isUserEligibleForSession(session.user.id))) {
    return null;
  }

  return session;
}

export async function getUserPermissions(userId: string) {
  const rows = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(
      permissions,
      eq(rolePermissions.permissionCode, permissions.code),
    )
    .where(eq(userRoles.userId, userId));

  return [...new Set(rows.map((row) => row.code))];
}

export async function requirePermission(
  requiredPermission: PermissionCode,
  requestHeaders?: Headers,
) {
  const session = await getCurrentSession(requestHeaders);

  if (!session) {
    throw new AccessError(401, "UNAUTHENTICATED", "Sign in is required.");
  }

  const grantedPermissions = await getUserPermissions(session.user.id);

  if (!hasPermission(grantedPermissions, requiredPermission)) {
    throw new AccessError(403, "FORBIDDEN", "You do not have permission.");
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

export async function hasUserPermission(
  userId: string,
  permission: PermissionCode,
) {
  const [grant] = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(
      permissions,
      eq(rolePermissions.permissionCode, permissions.code),
    )
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(permissions.code, permission),
      ),
    )
    .limit(1);

  return grant !== undefined;
}

export async function getUserRoleCodes(userId: string) {
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return [...new Set(rows.map((row) => row.code))];
}
