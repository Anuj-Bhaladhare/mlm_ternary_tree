import "server-only";

import { createHash, randomBytes } from "node:crypto";

const tokenBytes = 32;

export function createOneTimeToken() {
  const token = randomBytes(tokenBytes).toString("base64url");
  return { token, tokenHash: hashOneTimeToken(token) };
}

export function hashOneTimeToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashIdempotencyPayload(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}
