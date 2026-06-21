"use server"

import { randomBytes, randomInt } from "node:crypto"
import { redirect } from "next/navigation"
import { and, desc, eq, gt } from "drizzle-orm"

import { db } from "@/lib/db"
import { appUser, loginAttempt, telegramContact } from "@/lib/db/schema"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { err, ok, type Result } from "@/lib/result"
import { normalizePhone } from "./phone"
import { createSession, destroySession } from "./session"
import { botDeepLink, sendMessage, telegramConfigured } from "./telegram"

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const REQUEST_WINDOW_MS = 15 * 60 * 1000
const REQUEST_MAX = 5

// Анти-брутфорс запроса кода (in-memory, на процесс — single-container).
const reqWindow = new Map<string, { count: number; first: number }>()
function requestThrottled(phone: string): boolean {
  const now = Date.now()
  const rec = reqWindow.get(phone)
  if (!rec || now - rec.first > REQUEST_WINDOW_MS) {
    reqWindow.set(phone, { count: 1, first: now })
    return false
  }
  rec.count += 1
  return rec.count > REQUEST_MAX
}

const TEST_PHONE = normalizePhone(env.TEST_LOGIN_PHONE)
const BOOTSTRAP_PHONE = normalizePhone(env.BOOTSTRAP_ADMIN_PHONE)

export type RequestCodeResult = Result<{ token: string; deepLink: string; sentToBot: boolean }>

// Шаг 1: запросить код по телефону. Создаёт попытку; если знаем Telegram номера —
// шлём код проактивно, иначе отдаём deep-link на бота (там поделиться контактом).
export async function requestCode(phoneRaw: string): Promise<RequestCodeResult> {
  const phone = normalizePhone(phoneRaw)
  if (!phone) return err("Введите корректный номер телефона")
  if (requestThrottled(phone)) return err("Слишком много запросов. Попробуйте через 15 минут")

  // Тест-вход: код фиксированный, бот не нужен.
  if (TEST_PHONE && phone === TEST_PHONE) {
    return ok({ token: "test", deepLink: "", sentToBot: false })
  }

  // ЗАКРЫТЫЙ ВХОД (медданные): код выдаём ТОЛЬКО заведённым телефонам (или bootstrap-админу).
  // Бот отдаёт код лишь по существующей попытке → неизвестным номерам код не уйдёт.
  if (!(await isProvisioned(phone))) {
    return err("Этот номер не зарегистрирован. Обратитесь к администратору клиники.")
  }

  const code = String(randomInt(1000, 10000))
  const token = randomBytes(16).toString("hex")
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await db().insert(loginAttempt).values({ phone, code, token, expiresAt })

  // Знаем ли Telegram этого номера? Тогда шлём код сразу.
  let sentToBot = false
  if (telegramConfigured()) {
    const known = await db()
      .select({ tg: telegramContact.telegramUserId })
      .from(telegramContact)
      .where(eq(telegramContact.phone, phone))
      .limit(1)
    const chatId = known[0]?.tg
    if (chatId) {
      try {
        await sendMessage(
          chatId,
          `Ваш код для входа в Doc.on: <b>${code}</b>\nКод действует 10 минут.`,
        )
        await db().update(loginAttempt).set({ chatId }).where(eq(loginAttempt.token, token))
        sentToBot = true
      } catch (e) {
        log.error("requestCode_send_failed", { error: String(e) })
      }
    }
  }
  return ok({ token, deepLink: botDeepLink(token), sentToBot })
}

export type VerifyResult = Result<{ isPlatformAdmin: boolean }>

// Шаг 2: проверить код, завести/найти пользователя, открыть сессию.
export async function verifyCode(phoneRaw: string, codeRaw: string): Promise<VerifyResult> {
  const phone = normalizePhone(phoneRaw)
  const code = (codeRaw ?? "").trim()
  if (!phone || !code) return err("Введите номер и код")

  // Тест-вход (демо): заводит/находит тест-пользователя.
  if (TEST_PHONE && phone === TEST_PHONE && env.TEST_LOGIN_CODE && code === env.TEST_LOGIN_CODE) {
    const existing = await db().select().from(appUser).where(eq(appUser.phone, phone)).limit(1)
    let user = existing[0]
    if (!user) {
      const ins = await db()
        .insert(appUser)
        .values({ phone, isPlatformAdmin: BOOTSTRAP_PHONE === phone, lastLoginAt: new Date() })
        .returning()
      user = ins[0]
    }
    await createSession(user.id)
    return ok({ isPlatformAdmin: user.isPlatformAdmin })
  }

  const rows = await db()
    .select()
    .from(loginAttempt)
    .where(and(eq(loginAttempt.phone, phone), gt(loginAttempt.expiresAt, new Date())))
    .orderBy(desc(loginAttempt.createdAt))
    .limit(1)
  const attempt = rows[0]
  if (!attempt) return err("Код не найден или истёк — запросите новый")
  if (attempt.attempts >= MAX_CODE_ATTEMPTS) return err("Слишком много попыток — запросите новый код")
  if (attempt.code !== code) {
    await db().update(loginAttempt).set({ attempts: attempt.attempts + 1 }).where(eq(loginAttempt.id, attempt.id))
    return err("Неверный код")
  }
  await db().update(loginAttempt).set({ verified: true }).where(eq(loginAttempt.id, attempt.id))

  const user = await resolveUserForLogin(phone, attempt.chatId ?? undefined)
  if (!user) return err("Этот номер не зарегистрирован. Обратитесь к администратору клиники.")
  await createSession(user.id)
  log.info("login_ok", { userId: user.id, isPlatformAdmin: user.isPlatformAdmin })
  return ok({ isPlatformAdmin: user.isPlatformAdmin })
}

// Известный ли телефон: bootstrap-админ ИЛИ уже заведён админом (закрытый вход).
async function isProvisioned(phone: string): Promise<boolean> {
  if (BOOTSTRAP_PHONE != null && phone === BOOTSTRAP_PHONE) return true
  const rows = await db().select({ id: appUser.id }).from(appUser).where(eq(appUser.phone, phone)).limit(1)
  return rows.length > 0
}

// Вход разрешён ТОЛЬКО заведённым (или bootstrap). Неизвестных НЕ создаём (медданные).
async function resolveUserForLogin(phone: string, telegramUserId?: string) {
  const existing = await db().select().from(appUser).where(eq(appUser.phone, phone)).limit(1)
  const isBootstrap = BOOTSTRAP_PHONE != null && phone === BOOTSTRAP_PHONE
  const user = existing[0]
  if (!user) {
    if (!isBootstrap) return null // закрытый вход — неизвестных не впускаем
    const ins = await db()
      .insert(appUser)
      .values({ phone, isPlatformAdmin: true, telegramUserId, lastLoginAt: new Date() })
      .returning()
    return ins[0]
  }
  const patch: Partial<typeof appUser.$inferInsert> = { lastLoginAt: new Date() }
  if (isBootstrap && !user.isPlatformAdmin) patch.isPlatformAdmin = true
  if (telegramUserId && !user.telegramUserId) patch.telegramUserId = telegramUserId
  const upd = await db().update(appUser).set(patch).where(eq(appUser.id, user.id)).returning()
  return upd[0]
}

export async function logout() {
  await destroySession()
  redirect("/login")
}
