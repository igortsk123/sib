import "server-only"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/env"
import * as schema from "./schema"

// ─────────────────────────────────────────────────────────────────────
// Ленивый Drizzle-клиент. Подключение создаётся при ПЕРВОМ вызове db(),
// не при импорте/сборке — поэтому образ собирается без живой БД.
// Доменная схема наполняется по вертикальным срезам (lib/db/schema).
// ─────────────────────────────────────────────────────────────────────
let _client: ReturnType<typeof postgres> | null = null
let _db: PostgresJsDatabase<typeof schema> | null = null

export function db(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL не задан — БД ещё не подключена на этом окружении.")
  }
  _client = postgres(env.DATABASE_URL, { prepare: false })
  _db = drizzle(_client, { schema })
  return _db
}

export { schema }
