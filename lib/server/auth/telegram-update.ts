import "server-only"
import { and, desc, eq, gt } from "drizzle-orm"

import { db } from "@/lib/db"
import { loginAttempt, telegramContact } from "@/lib/db/schema"
import { log } from "@/lib/log"
import { normalizePhone } from "./phone"

// Ответ боту (что отправить). Используется long-poll воркером.
export type TgReply = {
  chat_id: number | string
  text: string
  reply_markup?: Record<string, unknown>
}

const shareContactKeyboard = {
  keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
}
const codeMessage = (code: string) =>
  `Ваш код для входа в Doc.on (гарантийные письма ДМС): <b>${code}</b>\n\n` +
  `Нажмите «📋 Скопировать код» и вставьте его на сайте. Код действует 10 минут.`
const copyCodeMarkup = (code: string) => ({
  inline_keyboard: [[{ text: "📋 Скопировать код", copy_text: { text: code } }]],
})
const askShare =
  "Здравствуйте! Чтобы получить код для входа, нажмите «📱 Поделиться номером» ниже.\n\n" +
  "Так я пойму, кто вы, и пришлю код сюда же.\n\n" +
  "Если кнопки нет — сначала на сайте введите номер и нажмите «Получить код в Telegram»."

async function pendingAttemptByPhone(phone: string) {
  const rows = await db()
    .select()
    .from(loginAttempt)
    .where(and(eq(loginAttempt.phone, phone), gt(loginAttempt.expiresAt, new Date())))
    .orderBy(desc(loginAttempt.createdAt))
    .limit(1)
  return rows[0]
}

async function knownPhone(telegramUserId: string): Promise<string | null> {
  const rows = await db()
    .select({ phone: telegramContact.phone })
    .from(telegramContact)
    .where(eq(telegramContact.telegramUserId, telegramUserId))
    .limit(1)
  return rows[0]?.phone ?? null
}

async function rememberContact(telegramUserId: string, phone: string) {
  await db()
    .insert(telegramContact)
    .values({ telegramUserId, phone })
    .onConflictDoUpdate({ target: telegramContact.telegramUserId, set: { phone } })
}

async function codeOrNoAttempt(chatId: number | string, phone: string): Promise<TgReply> {
  const attempt = await pendingAttemptByPhone(phone)
  if (!attempt) {
    return {
      chat_id: chatId,
      text: `Не вижу активного запроса для номера ${phone}. На сайте введите этот номер и нажмите «Получить код в Telegram».`,
    }
  }
  await db().update(loginAttempt).set({ chatId: String(chatId) }).where(eq(loginAttempt.id, attempt.id))
  return { chat_id: chatId, text: codeMessage(attempt.code), reply_markup: copyCodeMarkup(attempt.code) }
}

// Обработка одного апдейта Telegram. Возвращает ответ или null.
export async function processTelegramUpdate(update: unknown): Promise<TgReply | null> {
  const u = update as {
    message?: {
      chat?: { id?: number | string }
      from?: { id?: number }
      contact?: { phone_number?: string; user_id?: number }
    }
  }
  const msg = u?.message
  const chatId = msg?.chat?.id
  if (!chatId) return null
  const fromId = String(msg?.from?.id ?? chatId)

  // 1) Поделился контактом — принимаем ТОЛЬКО свой (contact.user_id === from.id).
  const contact = msg?.contact
  if (contact?.phone_number) {
    const own = contact.user_id != null && msg?.from?.id != null && contact.user_id === msg.from.id
    if (!own) {
      return {
        chat_id: chatId,
        text: "Поделитесь, пожалуйста, СВОИМ номером кнопкой ниже (не пересылайте чужой контакт).",
        reply_markup: shareContactKeyboard,
      }
    }
    const phone = normalizePhone(contact.phone_number)
    if (!phone) {
      return { chat_id: chatId, text: "Не удалось распознать номер. Попробуйте ещё раз.", reply_markup: shareContactKeyboard }
    }
    await rememberContact(fromId, phone)
    return codeOrNoAttempt(chatId, phone)
  }

  // 2) Уже знаем номер этого аккаунта → сразу код.
  const phone = await knownPhone(fromId)
  if (phone) return codeOrNoAttempt(chatId, phone)

  // 3) Просим поделиться.
  log.info("tg_ask_share", { fromId })
  return { chat_id: chatId, text: askShare, reply_markup: shareContactKeyboard }
}
