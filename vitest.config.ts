import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(root, "."),
      // "server-only" бросает вне RSC — для юнит-тестов серверных модулей алиасим в no-op.
      "server-only": resolve(root, "test/server-only-stub.ts"),
    },
  },
  test: { include: ["lib/**/*.test.ts"] },
})
