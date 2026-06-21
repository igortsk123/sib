import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"
import { insuranceCompany } from "@/lib/db/schema"
import { INSURER_SEED } from "./insurers"

// ─────────────────────────────────────────────────────────────────────
// Идемпотентный сид. Запускается из деплоя после миграций (`pnpm db:seed`).
// Отдельное подключение (не серверный lib/db) — выполняется через tsx вне Next.
// onConflictDoNothing по name: первый прогон вставляет, последующие не затирают
// ручные правки реестра.
// ─────────────────────────────────────────────────────────────────────
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[seed] DATABASE_URL не задан — пропускаю сид")
    process.exit(0)
  }
  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })
  try {
    const res = await db
      .insert(insuranceCompany)
      .values(INSURER_SEED)
      .onConflictDoNothing({ target: insuranceCompany.name })
    console.log(`[seed] insurer registry ok (${INSURER_SEED.length} в сиде, вставлено новых: ${res.count})`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[seed] FAILED", e)
  process.exit(1)
})
