import "server-only"

import { log } from "@/lib/log"
import { deleteWebhook, getUpdates, sendMessage } from "./telegram"
import { processTelegramUpdate } from "./telegram-update"

// ─────────────────────────────────────────────────────────────────────
// Long-poll воркер (старт из instrumentation.ts). Хостер режет Telegram-IP и
// на ВХОД (webhook не доставляется) → сервер сам забирает апдейты и отвечает,
// всё через исходящий прокси TELEGRAM_API_BASE.
// ─────────────────────────────────────────────────────────────────────
const POLL_TIMEOUT_SEC = 20
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let started = false

export function startTelegramPolling() {
  if (started) return
  started = true
  void pollLoop()
}

async function pollLoop() {
  try {
    await deleteWebhook() // иначе getUpdates → 409 Conflict
    log.info("tg_poll_started", {})
  } catch (e) {
    log.error("tg_poll_delete_webhook_failed", { error: String(e) })
  }

  // Слить бэклог без обработки (после рестарта не рассылаем старые коды).
  let offset = 0
  try {
    const backlog = await getUpdates(0, 0)
    const last = backlog[backlog.length - 1] as { update_id?: number } | undefined
    const lastId = Number(last?.update_id)
    if (Number.isInteger(lastId)) offset = lastId + 1
  } catch (e) {
    log.error("tg_poll_drain_failed", { error: String(e) })
  }

  for (;;) {
    try {
      const updates = await getUpdates(offset, POLL_TIMEOUT_SEC)
      for (const upd of updates) {
        const next = Number((upd as { update_id?: number }).update_id)
        if (Number.isInteger(next)) offset = next + 1
        try {
          const reply = await processTelegramUpdate(upd)
          if (reply) await sendMessage(reply.chat_id, reply.text, reply.reply_markup)
        } catch (e) {
          log.error("tg_poll_process_failed", { error: String(e) })
        }
      }
    } catch (e) {
      log.error("tg_poll_get_updates_failed", { error: String(e) })
      await sleep(3000)
    }
  }
}
