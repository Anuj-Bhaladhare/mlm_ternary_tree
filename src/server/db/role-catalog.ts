import type { db } from "./client";
import { permissions, rolePermissions, roles } from "./schema";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const permissionCatalog = [
  ["dashboard:read", "View the authenticated dashboard"],
  ["admin.members.read", "View all member records"],
  ["admin.members.create", "Create member accounts and placements"],
  ["admin.members.manage", "Edit member accounts and issue setup links"],
  ["admin.genealogy.view", "View the full ternary placement tree"],
] as const;

const roleCatalog = [
  { code: "member", name: "Member", grants: ["dashboard:read"] },
  {
    code: "support",
    name: "Support Operator",
    grants: ["dashboard:read"],
  },
  {
    code: "administrator",
    name: "Administrator",
    grants: [
      "dashboard:read",
      "admin.members.read",
      "admin.members.create",
      "admin.members.manage",
      "admin.genealogy.view",
    ],
  },
  { code: "finance", name: "Finance Manager", grants: ["dashboard:read"] },
] as const;

export async function initializeRoleCatalog(tx: DatabaseTransaction) {
  await tx
    .insert(permissions)
    .values(
      permissionCatalog.map(([code, description]) => ({
        code,
        description,
      })),
    )
    .onConflictDoUpdate({
      target: permissions.code,
      set: { description: permissions.description },
    });

  const savedRoles = await tx
    .insert(roles)
    .values(roleCatalog.map(({ code, name }) => ({ code, name })))
    .onConflictDoUpdate({
      target: roles.code,
      set: { name: roles.name },
    })
    .returning({ id: roles.id, code: roles.code });

  for (const role of roleCatalog) {
    const savedRole = savedRoles.find(({ code }) => code === role.code);

    if (!savedRole) {
      throw new Error(`Unable to initialize role "${role.code}".`);
    }

    await tx
      .insert(rolePermissions)
      .values(
        role.grants.map((permissionCode) => ({
          roleId: savedRole.id,
          permissionCode,
        })),
      )
      .onConflictDoNothing();
  }

  return savedRoles;
}
