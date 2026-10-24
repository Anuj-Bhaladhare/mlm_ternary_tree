import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  accountSetupTokens,
  accounts,
  auditLogs,
  members,
  roles,
  sessions,
  userRoles,
  users,
} from "@/server/db/schema";
import { getAdminBootstrapEnv, getAdminCreationKey } from "@/lib/env";
import { createOneTimeToken, hashOneTimeToken } from "./tokens";
import { initializeRoleCatalog } from "@/server/db/role-catalog";
import type { UpdateMemberInput } from "@/modules/members/rules";

const setupTokenLifetimeMs = 24 * 60 * 60 * 1000;

export class AccountDomainError extends Error {
  constructor(
    public readonly code:
      | "ADMIN_BOOTSTRAP_UNAVAILABLE"
      | "ADMIN_REGISTRATION_UNAVAILABLE"
      | "ADMIN_EMAIL_TAKEN"
      | "ADMIN_ALREADY_INITIALIZED"
      | "ADMIN_IDENTITY_CONFLICT"
      | "INVALID_OR_EXPIRED_TOKEN"
      | "MEMBER_NOT_FOUND"
      | "MEMBER_ACCOUNT_NOT_FOUND"
      | "PASSWORD_SETUP_REQUIRED"
      | "ACCOUNT_EMAIL_TAKEN",
    message: string,
  ) {
    super(message);
    this.name = "AccountDomainError";
  }
}

function sameSecret(actual: string, expected: string) {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function normalizeIdentifier(identifier: string) {
  return identifier.includes("@")
    ? identifier.trim().toLowerCase()
    : identifier.trim().toUpperCase();
}

export async function getAdministratorBootstrapStatus() {
  const env = getAdminBootstrapEnv();
  const [administrator] = await db
    .select({ passwordSetAt: users.passwordSetAt })
    .from(users)
    .where(eq(users.loginId, env.ADMIN_ID))
    .limit(1);

  return { initialized: Boolean(administrator?.passwordSetAt) };
}

export async function bootstrapAdministrator(input: {
  identifier: string;
  setupToken: string;
  password: string;
}) {
  const env = getAdminBootstrapEnv();
  const identifier = normalizeIdentifier(input.identifier);
  const configuredIdentity =
    identifier === env.ADMIN_ID || identifier === env.ADMIN_EMAIL;

  if (!configuredIdentity || !sameSecret(input.setupToken, env.ADMIN_SETUP_TOKEN)) {
    throw new AccountDomainError(
      "ADMIN_BOOTSTRAP_UNAVAILABLE",
      "The administrator setup request could not be verified.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    // A transaction-scoped advisory lock means concurrent first-use requests
    // cannot both claim the environment-defined identity.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2481450291)`);

    const [administratorRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, "administrator"))
      .limit(1);

    if (!administratorRole) {
      throw new AccountDomainError(
        "ADMIN_BOOTSTRAP_UNAVAILABLE",
        "Administrator roles have not been initialized.",
      );
    }

    const [existingAdministrator] = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, administratorRole.id))
      .limit(1);

    const [configuredUser] = await tx
      .select({
        id: users.id,
        loginId: users.loginId,
        email: users.email,
        passwordSetAt: users.passwordSetAt,
      })
      .from(users)
      .where(eq(users.loginId, env.ADMIN_ID))
      .limit(1);

    if (configuredUser?.passwordSetAt) {
      throw new AccountDomainError(
        "ADMIN_ALREADY_INITIALIZED",
        "The predefined administrator has already been initialized.",
      );
    }

    const [emailOwner] = await tx
      .select({ id: users.id, loginId: users.loginId })
      .from(users)
      .where(eq(users.email, env.ADMIN_EMAIL))
      .limit(1);

    if (
      emailOwner &&
      (!configuredUser || emailOwner.id !== configuredUser.id)
    ) {
      throw new AccountDomainError(
        "ADMIN_IDENTITY_CONFLICT",
        "The configured administrator identity conflicts with an existing account.",
      );
    }

    if (
      existingAdministrator &&
      existingAdministrator.userId !== configuredUser?.id
    ) {
      throw new AccountDomainError(
        "ADMIN_ALREADY_INITIALIZED",
        "An administrator account has already been initialized.",
      );
    }

    const userId = configuredUser?.id ?? crypto.randomUUID();

    if (!configuredUser) {
      await tx.insert(users).values({
        id: userId,
        name: "Administrator",
        email: env.ADMIN_EMAIL,
        loginId: env.ADMIN_ID,
        isActive: true,
        passwordSetAt: new Date(),
      });

      await tx.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
    } else {
      const [credential] = await tx
        .select({ id: accounts.id, password: accounts.password })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, "credential"),
          ),
        )
        .limit(1);

      if (credential?.password) {
        throw new AccountDomainError(
          "ADMIN_ALREADY_INITIALIZED",
          "The predefined administrator has already been initialized.",
        );
      }

      await tx
        .update(users)
        .set({
          email: env.ADMIN_EMAIL,
          loginId: env.ADMIN_ID,
          isActive: true,
          passwordSetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      if (credential) {
        await tx
          .update(accounts)
          .set({ password: passwordHash, updatedAt: new Date() })
          .where(eq(accounts.id, credential.id));
      } else {
        await tx.insert(accounts).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        });
      }
    }

    await tx
      .insert(userRoles)
      .values({ userId, roleId: administratorRole.id })
      .onConflictDoNothing();

    await tx.insert(auditLogs).values({
      actorId: userId,
      action: "admin.bootstrap.initialized",
      resourceType: "user",
      resourceId: userId,
      outcome: "success",
      metadata: { loginId: env.ADMIN_ID },
    });

    return { userId };
  });
}

export async function registerAdministrator(input: {
  email: string;
  password: string;
  confirmPassword: string;
  secretKey: string;
}) {
  const expectedSecret = getAdminCreationKey();
  if (!sameSecret(input.secretKey, expectedSecret)) {
    throw new AccountDomainError(
      "ADMIN_REGISTRATION_UNAVAILABLE",
      "Administrator registration could not be verified.",
    );
  }

  if (input.password !== input.confirmPassword) {
    throw new AccountDomainError(
      "ADMIN_REGISTRATION_UNAVAILABLE",
      "Review the registration details and try again.",
    );
  }

  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${email}))`,
    );
    const roleCatalog = await initializeRoleCatalog(tx);

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existingUser) {
      throw new AccountDomainError(
        "ADMIN_EMAIL_TAKEN",
        "An account with this email already exists.",
      );
    }

    const administratorRole = roleCatalog.find(
      ({ code }) => code === "administrator",
    );

    if (!administratorRole) {
      throw new AccountDomainError(
        "ADMIN_REGISTRATION_UNAVAILABLE",
        "Administrator registration is not available right now.",
      );
    }

    const userId = crypto.randomUUID();
    await tx.insert(users).values({
      id: userId,
      name: "Administrator",
      email,
      isActive: true,
      passwordSetAt: new Date(),
    });

    await tx.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });

    await tx.insert(userRoles).values({
      userId,
      roleId: administratorRole.id,
    });

    await tx.insert(auditLogs).values({
      actorId: userId,
      action: "admin.registration.created",
      resourceType: "user",
      resourceId: userId,
      outcome: "success",
      metadata: { email },
    });

    return { userId };
  });
}

export async function resolveLoginEmail(identifier: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(
      normalizedIdentifier.includes("@")
        ? eq(users.email, normalizedIdentifier)
        : eq(users.loginId, normalizedIdentifier),
    )
    .limit(1);

  return user?.email ?? null;
}

export async function isUserEligibleForSession(userId: string) {
  const [user] = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.isActive) {
    return false;
  }

  const [member] = await db
    .select({ status: members.status })
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);

  return !member || member.status === "ACTIVE";
}

export async function issueMemberSetupToken(
  memberId: string,
  actorId: string,
  purpose: "INITIAL_SETUP" | "PASSWORD_RESET",
) {
  const { token, tokenHash } = createOneTimeToken();
  const expiresAt = new Date(Date.now() + setupTokenLifetimeMs);

  return db.transaction(async (tx) => {
    const [member] = await tx
      .select({ id: members.id, userId: members.userId, memberCode: members.memberCode })
      .from(members)
      .where(eq(members.id, memberId))
      .for("update")
      .limit(1);

    if (!member) {
      throw new AccountDomainError("MEMBER_NOT_FOUND", "Member not found.");
    }
    if (!member.userId) {
      throw new AccountDomainError(
        "MEMBER_ACCOUNT_NOT_FOUND",
        "This legacy member does not have a linked account.",
      );
    }

    // A new link invalidates every outstanding link for this account. This
    // prevents an older activation/reset message from being reused later.
    await tx
      .update(accountSetupTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(accountSetupTokens.userId, member.userId),
          isNull(accountSetupTokens.consumedAt),
        ),
      );

    await tx.insert(accountSetupTokens).values({
      userId: member.userId,
      tokenHash,
      purpose,
      expiresAt,
      createdBy: actorId,
    });

    await tx.insert(auditLogs).values({
      actorId,
      action:
        purpose === "INITIAL_SETUP"
          ? "admin.member.activation_issued"
          : "admin.member.password_reset_issued",
      resourceType: "member",
      resourceId: member.id,
      outcome: "success",
      metadata: { memberCode: member.memberCode, expiresAt: expiresAt.toISOString() },
    });

    return { token, expiresAt };
  });
}

export async function consumeMemberSetupToken(input: {
  token: string;
  password: string;
}) {
  const tokenHash = hashOneTimeToken(input.token);
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [token] = await tx
      .select({
        id: accountSetupTokens.id,
        userId: accountSetupTokens.userId,
        purpose: accountSetupTokens.purpose,
        expiresAt: accountSetupTokens.expiresAt,
        consumedAt: accountSetupTokens.consumedAt,
      })
      .from(accountSetupTokens)
      .where(eq(accountSetupTokens.tokenHash, tokenHash))
      .for("update")
      .limit(1);

    if (!token || token.consumedAt || token.expiresAt <= new Date()) {
      throw new AccountDomainError(
        "INVALID_OR_EXPIRED_TOKEN",
        "This setup link is invalid, expired, or has already been used.",
      );
    }

    const [credential] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, token.userId),
          eq(accounts.providerId, "credential"),
        ),
      )
      .limit(1);

    if (credential) {
      await tx
        .update(accounts)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(accounts.id, credential.id));
    } else {
      await tx.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: token.userId,
        providerId: "credential",
        userId: token.userId,
        password: passwordHash,
      });
    }

    await tx
      .update(users)
      .set({ passwordSetAt: new Date(), isActive: true, updatedAt: new Date() })
      .where(eq(users.id, token.userId));

    if (token.purpose === "INITIAL_SETUP") {
      await tx
        .update(members)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(eq(members.userId, token.userId));
    } else {
      await tx.delete(sessions).where(eq(sessions.userId, token.userId));
    }

    await tx
      .update(accountSetupTokens)
      .set({ consumedAt: new Date() })
      .where(eq(accountSetupTokens.id, token.id));

    await tx.insert(auditLogs).values({
      actorId: token.userId,
      action:
        token.purpose === "INITIAL_SETUP"
          ? "member.account.activated"
          : "member.password.reset",
      resourceType: "user",
      resourceId: token.userId,
      outcome: "success",
      metadata: { purpose: token.purpose },
    });
  });
}

export async function updateMemberAccount(
  memberId: string,
  input: UpdateMemberInput,
  actorId: string,
) {
  try {
    return await db.transaction(async (tx) => {
      const [member] = await tx
        .select({
          id: members.id,
          userId: members.userId,
          memberCode: members.memberCode,
        })
        .from(members)
        .where(eq(members.id, memberId))
        .for("update")
        .limit(1);

      if (!member) {
        throw new AccountDomainError("MEMBER_NOT_FOUND", "Member not found.");
      }
      if (!member.userId) {
        throw new AccountDomainError(
          "MEMBER_ACCOUNT_NOT_FOUND",
          "This legacy member does not have a linked account.",
        );
      }

      const [account] = await tx
        .select({ passwordSetAt: users.passwordSetAt })
        .from(users)
        .where(eq(users.id, member.userId))
        .limit(1);

      if (input.status === "ACTIVE" && !account?.passwordSetAt) {
        throw new AccountDomainError(
          "PASSWORD_SETUP_REQUIRED",
          "A member cannot be activated before completing password setup.",
        );
      }

      const [updated] = await tx
        .update(members)
        .set({
          name: input.name,
          email: input.email,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id))
        .returning({
          id: members.id,
          memberCode: members.memberCode,
          name: members.name,
          email: members.email,
          status: members.status,
        });

      await tx
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          isActive: input.status !== "SUSPENDED",
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));

      if (input.status === "SUSPENDED") {
        await tx.delete(sessions).where(eq(sessions.userId, member.userId));
      }

      await tx.insert(auditLogs).values({
        actorId,
        action: "admin.member.updated",
        resourceType: "member",
        resourceId: member.id,
        outcome: "success",
        metadata: { memberCode: member.memberCode, status: input.status },
      });

      return updated;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "constraint_name" in error &&
      ((error as { constraint_name?: unknown }).constraint_name ===
        "user_email_unique" ||
        (error as { constraint_name?: unknown }).constraint_name ===
          "members_email_unique")
    ) {
      throw new AccountDomainError(
        "ACCOUNT_EMAIL_TAKEN",
        "Another account already uses that email address.",
      );
    }
    throw error;
  }
}

export async function getMemberForUser(userId: string) {
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);
  return member ?? null;
}
