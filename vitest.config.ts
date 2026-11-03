import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the React server runtime; stub it in tests
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "tests/rls/**/*.test.ts"],
    // RLS and integration tests share the two test users in budgi-dev
    fileParallelism: false,
    // budgi-dev is a remote project; several requests per hook can take a while
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // Load all variables from .env (not only VITE_*) for integration tests
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
