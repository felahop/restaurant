import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Интеграционные тесты с настоящей базой (нужен DATABASE_URL и применённые миграции с сидом). */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
