import "server-only"

import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { err, ok, type Result } from "@/lib/result"

// ─────────────────────────────────────────────────────────────────────
// Тонкий клиент OpenAI через RU-прокси (порт паттерна sup2). Прямой запрос из РФ →
// 403 unsupported_country_region ⇒ прокси `OPENAI_BASE_URL` ОБЯЗАТЕЛЕН. Без внешних
// зависимостей (fetch). Модель — `OPENAI_MODEL` (default gpt-5.4-mini, ADR D10).
// Используется для извлечения полей ГП из очищенного текста (Structured Outputs strict).
// Логирование полное разрешено (ADR D10) — секреты (ключ) не пишем.
// ─────────────────────────────────────────────────────────────────────

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type ChatOpts = {
  temperature?: number
  jsonMode?: boolean
  // jsonSchema — жёсткая структура ответа (Structured Outputs, strict:true): API
  // гарантирует ровно эту схему (constrained decoding) — сильнее json_object.
  jsonSchema?: Record<string, unknown>
  schemaName?: string
  maxTokens?: number
  timeoutMs?: number
}

export function isLlmConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY && env.OPENAI_BASE_URL)
}

export async function chatComplete(
  messages: ChatMessage[],
  opts?: ChatOpts,
): Promise<Result<string>> {
  if (!isLlmConfigured()) {
    return err("LLM не настроен (нет OPENAI_API_KEY/OPENAI_BASE_URL)")
  }
  const url = `${env.OPENAI_BASE_URL!.replace(/\/+$/, "")}/chat/completions`
  log.info("openai_request", {
    model: env.OPENAI_MODEL,
    jsonMode: Boolean(opts?.jsonMode || opts?.jsonSchema),
    messages,
  })
  const responseFormat = opts?.jsonSchema
    ? {
        type: "json_schema" as const,
        json_schema: { name: opts.schemaName ?? "result", strict: true, schema: opts.jsonSchema },
      }
    : opts?.jsonMode
      ? { type: "json_object" as const }
      : undefined
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 60_000)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages,
        // gpt-5.4-mini не принимает temperature/max_tokens → шлём только если заданы явно;
        // лимит — через max_completion_tokens.
        ...(opts?.temperature != null ? { temperature: opts.temperature } : {}),
        ...(opts?.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      log.error("openai_http_error", { status: res.status, body: body.slice(0, 300) })
      return err(`OpenAI ${res.status}`)
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
      usage?: unknown
    }
    const content = data.choices?.[0]?.message?.content ?? ""
    log.info("openai_response", { content, usage: data.usage })
    return ok(content)
  } catch (e) {
    log.error("openai_call_failed", { error: String(e) })
    return err("Не удалось обратиться к LLM")
  } finally {
    clearTimeout(timer)
  }
}
