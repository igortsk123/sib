import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { and, eq, isNotNull, sql } from "drizzle-orm"

import * as schema from "@/lib/db/schema"
import { appUser, docTemplate, guaranteeLetter, insuranceCompany } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Ежедневный Telegram-дайджест владельцу (гейт новых типов, ADR D48):
// «есть новые типы писем (N шт.) — нужно писать парсер». Без ПДн: только
// страховая / тип документа / количества. Получатели — платформенные админы
// с привязанным Telegram. Ничего нет — молчим. Запуск: systemd-таймер на
// сервере раз в день (docker exec sib-frontend npm run digest:newtypes).
// ─────────────────────────────────────────────────────────────────────

const DEMO_ORG_NAME = "Демо-клиника"

async function sendTelegram(chatId: string, text: string) {
  const base = process.env.TELEGRAM_API_BASE || "https://tg.claude-access.ru"
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан")
  const res = await fetch(`${base}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) throw new Error(`Telegram sendMessage ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[tg-digest] DATABASE_URL не задан")
    process.exit(1)
  }
  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })
  try {
    const notDemo = sql`${guaranteeLetter.organizationId} not in (select id from organization where name = ${DEMO_ORG_NAME})`
    const rows = await db
      .select({
        insurer: sql<string>`coalesce(${insuranceCompany.name}, 'СК не опознана')`,
        docType: sql<string>`coalesce(${guaranteeLetter.docType}::text, '?')`,
        emails: sql<number>`count(distinct ${guaranteeLetter.emailMessageId})::int`,
        letters: sql<number>`count(*)::int`,
      })
      .from(guaranteeLetter)
      .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
      .where(and(eq(guaranteeLetter.isHeld, true), notDemo))
      .groupBy(sql`1`, sql`2`)
      .orderBy(sql`3 desc`)
    if (!rows.length) {
      console.log("[tg-digest] отложенных нет — не шлём")
      return
    }
    const totalEmails = rows.reduce((s, r) => s + r.emails, 0)
    const typeLabels: Record<string, string> = {
      guarantee: "гарантийное письмо", enroll: "прикрепление", detach: "открепление",
      annul: "аннулирование", referral: "направление", other: "прочее",
    }
    const lines = rows.map((r) => `• ${r.insurer} / ${typeLabels[r.docType] ?? r.docType}: писем ${r.emails}, записей ${r.letters}`)
    const text = [
      `📬 Есть новые типы писем (${totalEmails} шт.) — нужно писать парсер.`,
      ...lines,
      "Письма отложены и в общий список не загружены; образцы сохранены в шаблонах (/insurers).",
      "После настройки парсера — «Активировать» на шаблоне, записи выйдут в реестр.",
    ].join("\n")

    const admins = await db
      .select({ tg: appUser.telegramUserId })
      .from(appUser)
      .where(and(eq(appUser.isPlatformAdmin, true), isNotNull(appUser.telegramUserId)))
    if (!admins.length) {
      console.error("[tg-digest] нет платформенных админов с Telegram — сообщить некому")
      return
    }
    let sent = 0
    for (const a of admins) {
      try {
        await sendTelegram(a.tg as string, text)
        sent++
      } catch (e) {
        console.error(`[tg-digest] не отправлено (${String(e).slice(0, 120)})`)
      }
    }
    console.log(`[tg-digest] отложено писем: ${totalEmails}; получателей: ${sent}/${admins.length}`)
    // Шаблоны-заготовки без активации — напоминание в логе (видно в journald).
    const pending = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(docTemplate)
      .where(eq(docTemplate.status, "new"))
    if (pending[0]?.n) console.log(`[tg-digest] шаблонов в статусе new: ${pending[0].n}`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[tg-digest] FAILED", e)
  process.exit(1)
})
