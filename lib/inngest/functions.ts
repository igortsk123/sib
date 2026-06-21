import { inngest } from "./client"

// ─────────────────────────────────────────────────────────────────────
// Реестр Inngest-функций. Пока каркас — один ping (проверка проводки).
// Прикладные функции (IMAP-забор, обработка вложений, OCR, LLM) — по срезам S1+.
// ─────────────────────────────────────────────────────────────────────
export const ping = inngest.createFunction(
  { id: "ping" },
  { event: "sib/ping" },
  async ({ event }) => {
    return { ok: true, received: event.name }
  },
)

export const functions = [ping]
