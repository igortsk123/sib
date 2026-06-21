import "server-only"
import { cookies } from "next/headers"
import { randomBytes } from "node:crypto"
import { and, eq, gt } from "drizzle-orm"

import { db } from "@/lib/db"
import { appUser, session } from "@/lib/db/schema"

const COOKIE = "sib_session"
const MAX_AGE_S = 60 * 60 * 24 * 30 // 30 дней

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + MAX_AGE_S * 1000)
  await db().insert(session).values({ userId, token, expiresAt })
  const jar = await cookies()
  jar.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE_S })
}

// Текущий пользователь по сессионной cookie (или null). Проверяем expiresAt на сервере.
export async function getCurrentUser() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const rows = await db()
    .select({ user: appUser, expiresAt: session.expiresAt })
    .from(session)
    .innerJoin(appUser, eq(appUser.id, session.userId))
    .where(and(eq(session.token, token), gt(session.expiresAt, new Date())))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  // Скользящая сессия: продлеваем не чаще раза в день.
  const renewThreshold = new Date(Date.now() + (MAX_AGE_S - 86400) * 1000)
  if (row.expiresAt < renewThreshold) {
    try {
      await db()
        .update(session)
        .set({ expiresAt: new Date(Date.now() + MAX_AGE_S * 1000) })
        .where(eq(session.token, token))
    } catch {
      // продление не критично
    }
  }
  return row.user
}

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) await db().delete(session).where(eq(session.token, token))
  jar.delete(COOKIE)
}
