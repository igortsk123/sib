import { execSync } from "node:child_process"

// Перед прогоном: миграции локальной БД + вымышленные фикстуры (идемпотентно).
export default function globalSetup() {
  execSync("npx drizzle-kit migrate", { stdio: "inherit" })
  execSync("npx tsx e2e/fixtures.ts", { stdio: "inherit" })
}
