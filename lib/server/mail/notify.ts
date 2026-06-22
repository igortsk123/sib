import "server-only"

import { env } from "@/lib/env"
import { log } from "@/lib/log"

// Уведомление автора репорта об исправлении ошибки. SMTP-отправка в приложении пока НЕ настроена
// (есть только IMAP-забор) — поэтому логируем письмо как «pending». Реальная отправка через Яндекс SMTP —
// после поднятия инфраструктуры (очередь S1). Возвращает true, если письмо реально отправлено.
export async function notifyErrorFixed(email: string, letterId: string): Promise<boolean> {
  const url = `${env.APP_URL.replace(/\/+$/, "")}/registry/${letterId}`
  const subject = "Ошибка в записи исправлена"
  const body = `Спасибо за сообщение об ошибке. Запись ${url} исправлена. Постараемся больше не допускать таких ошибок.`
  // TODO(SMTP): реальная отправка через Яндекс SMTP XOAUTH2. Пока письмо «в очереди» (лог).
  log.info("error_fixed_email_pending", { to: email, subject, body, letterId })
  return false
}
