import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.resolve(__dirname, ".env"));
  } catch {
    // Fall back to test defaults
  }
}

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://mlm_app:replace-with-local-password@localhost:5432/mlm_management",
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ||
        "replace-with-at-least-32-random-characters-before-use",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
});
