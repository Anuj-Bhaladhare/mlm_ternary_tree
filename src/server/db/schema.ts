import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const memberPosition = pgEnum("member_position", [
  "LEFT",
  "MIDDLE",
  "RIGHT",
]);
export const memberStatus = pgEnum("member_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
]);

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // `loginId` is an administrator ID or a member code. It is deliberately
    // separate from Better Auth's opaque primary key so it can be used as a
    // human-facing sign-in identifier without exposing implementation IDs.
    loginId: text("login_id"),
    isActive: boolean("is_active").notNull().default(true),
    passwordSetAt: timestamp("password_set_at", { withTimezone: true }),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    uniqueIndex("user_login_id_unique")
      .on(table.loginId)
      .where(sql`${table.loginId} IS NOT NULL`),
  ],
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("roles_code_unique").on(table.code)],
);

export const permissions = pgTable(
  "permissions",
  {
    code: text("code").primaryKey(),
    description: text("description").notNull(),
  },
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_role_id_idx").on(table.roleId),
  ],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionCode] }),
    index("role_permissions_permission_code_idx").on(table.permissionCode),
  ],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberCode: text("member_code").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    userId: text("user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    sponsorId: uuid("sponsor_id").references(
      (): AnyPgColumn => members.id,
      { onDelete: "restrict" },
    ),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => members.id,
      { onDelete: "restrict" },
    ),
    position: memberPosition("position"),
    isRoot: boolean("is_root").notNull().default(false),
    status: memberStatus("status").notNull().default("PENDING"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("members_member_code_unique").on(table.memberCode),
    uniqueIndex("members_email_unique")
      .on(table.email)
      .where(sql`${table.email} IS NOT NULL`),
    uniqueIndex("members_user_id_unique")
      .on(table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex("members_parent_position_unique")
      .on(table.parentId, table.position)
      .where(sql`${table.parentId} IS NOT NULL`),
    uniqueIndex("members_single_root_unique")
      .on(sql`(${table.isRoot})`)
      .where(sql`${table.isRoot} = true`),
    index("members_sponsor_id_idx").on(table.sponsorId),
    index("members_parent_id_idx").on(table.parentId),
    check(
      "members_parent_position_check",
      sql`(${table.parentId} IS NULL AND ${table.position} IS NULL) OR (${table.parentId} IS NOT NULL AND ${table.position} IS NOT NULL)`,
    ),
    check(
      "members_root_placement_check",
      sql`${table.isRoot} = (${table.parentId} IS NULL AND ${table.position} IS NULL)`,
    ),
    check(
      "members_not_own_parent_check",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),
    check(
      "members_not_own_sponsor_check",
      sql`${table.sponsorId} IS NULL OR ${table.sponsorId} <> ${table.id}`,
    ),
  ],
);

export const accountSetupTokenPurpose = pgEnum("account_setup_token_purpose", [
  "INITIAL_SETUP",
  "PASSWORD_RESET",
]);

export const accountSetupTokens = pgTable(
  "account_setup_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    purpose: accountSetupTokenPurpose("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_setup_tokens_hash_unique").on(table.tokenHash),
    index("account_setup_tokens_user_id_idx").on(table.userId),
    index("account_setup_tokens_expiry_idx").on(table.expiresAt),
  ],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idempotency_keys_actor_scope_key_unique").on(
      table.actorId,
      table.scope,
      table.key,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    outcome: text("outcome").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
};
