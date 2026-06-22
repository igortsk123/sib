import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"
import { insuranceCompany } from "@/lib/db/schema"
import { INSURER_SEED } from "./insurers"

const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)))

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
    // Идемпотентно по ДОМЕНУ (стабильный ключ): нашли существующую по пересечению доменов/алиасов →
    // ОБНОВЛЯЕМ официальное name + объединяем aliases/domains (переименование без дублей); иначе вставляем.
    const existing = await db
      .select({ id: insuranceCompany.id, name: insuranceCompany.name, aliases: insuranceCompany.aliases, domains: insuranceCompany.domains })
      .from(insuranceCompany)
    let upd = 0
    let ins = 0
    for (const s of INSURER_SEED) {
      const sDomains = s.domains ?? []
      const sAliases = s.aliases ?? []
      const match = existing.find(
        (e) => e.domains.some((d) => sDomains.includes(d)) || sAliases.includes(e.name) || e.name === s.name,
      )
      if (match) {
        await db
          .update(insuranceCompany)
          .set({
            name: s.name,
            aliases: uniq([...sAliases, match.name, ...match.aliases]),
            domains: uniq([...match.domains, ...sDomains]),
            updatedAt: new Date(),
          })
          .where(eq(insuranceCompany.id, match.id))
        upd++
      } else {
        await db.insert(insuranceCompany).values(s).onConflictDoNothing({ target: insuranceCompany.name })
        ins++
      }
    }
    console.log(`[seed] insurer registry ok (обновлено: ${upd}, вставлено: ${ins})`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[seed] FAILED", e)
  process.exit(1)
})
