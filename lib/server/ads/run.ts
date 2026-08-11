import { and, eq, isNotNull } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"
import { appUser } from "@/lib/db/schema"

import { formatReport, runWatchdog } from "./watchdog"

// ─────────────────────────────────────────────────────────────────────
// Точка входа робота-минусовщика (ADR D49). Запуск: npm run ads:watchdog.
// На сервере — systemd-таймер раз в час: docker exec sib-frontend npm run ads:watchdog
// (deploy/sib-ads-watchdog.timer). Тихо, когда добавлять нечего.
// ─────────────────────────────────────────────────────────────────────

async function notify(text: string) {
  const url = process.env.DATABASE_URL
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!url || !token) {
    console.error("[ads-watchdog] нет DATABASE_URL/TELEGRAM_BOT_TOKEN — отчёт только в лог")
    return
  }
  const base = process.env.TELEGRAM_API_BASE || "https://tg.claude-access.ru"
  const client = postgres(url, { prepare: false, max: 1 })
  try {
    const db = drizzle(client, { schema })
    const admins = await db
      .select({ tg: appUser.telegramUserId })
      .from(appUser)
      .where(and(eq(appUser.isPlatformAdmin, true), isNotNull(appUser.telegramUserId)))
    for (const a of admins) {
      const res = await fetch(`${base}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: a.tg, text }),
      })
      if (!res.ok) console.error(`[ads-watchdog] Telegram ${res.status}`)
    }
  } finally {
    await client.end({ timeout: 5 })
  }
}

async function main() {
  const res = await runWatchdog()
  if (!res.ok) {
    console.error("[ads-watchdog]", res.error)
    process.exit(1)
  }
  const r = res.value
  console.log(
    `[ads-watchdog] запросов ${r.scanned}, новых ${r.fresh}, применено ${r.applied.length}, ` +
      `отклонено ${r.rejected.length}${r.dryRun ? " (dry-run)" : ""}`,
  )
  for (const x of r.rejected.slice(0, 20)) console.log(`  ✗ ${x.root} — ${x.reason}`)
  // Минусы уже применены — упавшее уведомление не должно валить запуск (иначе systemd
  // отметит фейл и владелец решит, что чистка не прошла).
  const text = formatReport(r)
  if (text) await notify(text).catch((e) => console.error("[ads-watchdog] уведомление не ушло:", String(e).slice(0, 200)))
}

main().catch((e) => {
  console.error("[ads-watchdog] FAILED", e)
  process.exit(1)
})
