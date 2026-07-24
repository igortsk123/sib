import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appUser } from "@/lib/db/schema"
import { env } from "@/lib/env"
import { normalizePhone } from "@/lib/server/auth/phone"
import { createSession } from "@/lib/server/auth/session"

// Ссылка-инвайт на демо-стенд (ADR D22): /demo — вход демо-пользователем БЕЗ телефона/кода.
// Работает только если TEST_LOGIN_PHONE задан и пользователь заведён (org «Демо-клиника», role registry).
// Данные стенда вымышлены (баннер «ДЕМО-ДАННЫЕ»), поэтому публичная ссылка допустима by design.
export async function GET() {
  const phone = normalizePhone(env.TEST_LOGIN_PHONE)
  if (!phone) redirect("/login")
  const rows = await db().select().from(appUser).where(eq(appUser.phone, phone)).limit(1)
  const user = rows[0]
  if (!user) redirect("/login")
  await createSession(user.id)
  redirect("/registry")
}
