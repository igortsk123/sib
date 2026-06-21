import { sql } from "drizzle-orm"

import { db } from "@/lib/db"

// Health/readiness: статус БД + provenance (commit/время) для smoke-проверки деплоя.
// Деплой делает rollback, если /api/health не отвечает 200 в течение ~60с.
export const dynamic = "force-dynamic"

const startedAt = Date.now()

export async function GET() {
  let dbOk = false
  try {
    await db().execute(sql`select 1`)
    dbOk = true
  } catch {
    dbOk = false
  }

  const body = {
    ok: dbOk,
    service: "sib",
    db: dbOk ? "ok" : "down",
    commit: process.env.GIT_COMMIT ?? null,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    time: new Date().toISOString(),
  }
  return Response.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "cache-control": "no-store" },
  })
}
