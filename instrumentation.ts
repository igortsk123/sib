// Next instrumentation hook — один раз при старте сервера (nodejs runtime).
// Поднимает Telegram long-poll воркер (хостер режет webhook). Выключается
// TELEGRAM_POLLING=0 или отсутствием токена.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { env } = await import("./lib/env")
  if (!env.TELEGRAM_BOT_TOKEN) return
  if (env.TELEGRAM_POLLING === "0") return
  const { startTelegramPolling } = await import("./lib/server/auth/telegram-poll")
  startTelegramPolling()
}
