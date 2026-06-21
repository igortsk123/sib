import "server-only"
import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────
// Обёртка Telegram Bot API (бот doconpro_bot). Хостер режет api.telegram.org →
// все вызовы через прокси `TELEGRAM_API_BASE` (как sup2). Long-poll, т.к. входящий
// webhook тоже не доставляется.
// ─────────────────────────────────────────────────────────────────────
const api = (method: string) => `${env.TELEGRAM_API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`

export function telegramConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN)
}

// Deep-link: открывает бота с токеном привязки → /start <token> прилетит в апдейт.
export function botDeepLink(token: string): string {
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(token)}`
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан")
  const res = await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Telegram sendMessage ${res.status}: ${body}`)
  }
  return res.json()
}

// Long-polling: забрать апдейты через прокси. offset = последний update_id + 1.
export async function getUpdates(offset: number, timeoutSec = 20): Promise<unknown[]> {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан")
  const url =
    api("getUpdates") +
    `?timeout=${timeoutSec}&offset=${offset}&allowed_updates=${encodeURIComponent('["message"]')}`
  const res = await fetch(url, { signal: AbortSignal.timeout((timeoutSec + 15) * 1000) })
  const data = (await res.json()) as { ok: boolean; result?: unknown[]; error_code?: number; description?: string }
  if (!data.ok) throw new Error(`getUpdates ${data.error_code}: ${data.description}`)
  return data.result ?? []
}

// Снять webhook — обязательно перед getUpdates (иначе 409 Conflict).
export async function deleteWebhook() {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан")
  const res = await fetch(api("deleteWebhook"), { method: "POST" })
  return res.json()
}
