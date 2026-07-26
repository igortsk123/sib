import "server-only"

import { log } from "@/lib/log"
import { chatComplete, isLlmConfigured } from "@/lib/server/llm/openai"
import { patientCard } from "@/lib/server/patients/queries"

import { answerFromRules, type Clarify, type CoverageAnswer } from "./answer-core"
import { resolveCoverage, type ResolvedRule } from "./resolve"

// ─────────────────────────────────────────────────────────────────────
// Ответ на вопрос «можно ли сделать X пациенту за Y?» (фаза Ф-A).
// Сначала детерминированные гейты (answer-core, без LLM); только если правила молчат —
// mini-LLM с КОМПАКТНОЙ выжимкой правил (не 200-страничный PDF). ПДн в LLM не уходят:
// передаётся только текст услуги и обезличенный список правил.
// ─────────────────────────────────────────────────────────────────────

const LLM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "reason"],
  properties: {
    verdict: { type: "string", enum: ["yes", "no", "approval", "need_guarantee", "unknown"] },
    reason: { type: "string" },
  },
} as const

/** Компактная обезличенная выжимка правил для LLM (без ПДн). */
export function rulesDigest(rules: ResolvedRule[]): string {
  return rules
    .slice(0, 60)
    .map((r) => `- [${r.verdict}] ${r.servicePattern ?? r.serviceClass}${r.conditionText ? ` (условие: ${r.conditionText})` : ""}${r.limitAmount ? ` (лимит: ${r.limitAmount})` : ""} — ${r.clause}`)
    .join("\n")
}

export async function answerCoverageQuestion(args: {
  patientKey: string
  orgId: string | null
  serviceText: string
  amount: number | null
  clarify?: Clarify
}): Promise<CoverageAnswer & { patientFound: boolean }> {
  const card = await patientCard(args.patientKey, args.orgId)
  if (!card) {
    return { patientFound: false, verdict: "unknown", reasons: ["пациент не найден"], warnings: [], matchedRules: [], needsLlm: false }
  }

  const coverage = card.state.insuranceCompanyId
    ? await resolveCoverage({
        insuranceCompanyId: card.state.insuranceCompanyId,
        services: card.state.programs,
        onDate: new Date(),
      })
    : { matchedPrograms: [], unmatched: [], fallbackProgram: null, rules: [] }

  const base = answerFromRules(card.state, coverage.rules, args.serviceText, args.amount, coverage.fallbackProgram, args.clarify)
  if (!base.needsLlm) return { ...base, patientFound: true }

  // Детерминированно не ответили — пробуем mini-LLM с выжимкой правил (без ПДн).
  if (!isLlmConfigured() || coverage.rules.length === 0) {
    return { ...base, patientFound: true }
  }
  const digest = rulesDigest(coverage.rules)
  const res = await chatComplete(
    [
      {
        role: "system",
        content:
          "Ты помощник клиники по ДМС. По списку правил программы страхования ответь, покрывается ли услуга. " +
          "В списке могут быть правила, НЕ относящиеся к запрошенной услуге, — сначала выбери те, что прямо " +
          "о ней говорят, и отвечай только по ним. Нет прямо подходящего правила — verdict=unknown; " +
          "НЕ цитируй правило про другую услугу. " +
          "verdict: yes (покрыто), no (пациенту откажут), approval (нужно согласование страховой), " +
          "need_guarantee (нужно запросить гарантийное письмо), unknown. reason — одно предложение по-русски со ссылкой на пункт.",
      },
      { role: "user", content: `Услуга: ${args.serviceText}${args.amount ? `, сумма ${args.amount} ₽` : ""}\n\nПравила:\n${digest}` },
    ],
    { jsonSchema: LLM_SCHEMA as unknown as Record<string, unknown>, schemaName: "coverage_answer", timeoutMs: 30_000 },
  )
  if (!res.ok) {
    log.error("coverage_answer_llm_failed", { error: res.error })
    return { ...base, patientFound: true, warnings: [...base.warnings, "ИИ-подсказка недоступна — показан ответ по правилам"] }
  }
  try {
    const parsed = JSON.parse(res.value) as { verdict: CoverageAnswer["verdict"]; reason: string }
    return {
      ...base,
      patientFound: true,
      verdict: parsed.verdict,
      reasons: [...base.reasons, `ИИ по правилам программы: ${parsed.reason}`],
      warnings: [...base.warnings, "ответ дан ИИ по выжимке правил — сверьте с пунктом документа"],
    }
  } catch {
    return { ...base, patientFound: true }
  }
}

// Хвост истории для LLM: контекст правил уходит ВСЕГДА целиком, история диалога — последние N
// сообщений (владелец 26.07: «контекст правил отправляется в ЛЛМ всё время вместе с промптом
// и накапливает историю диалога»).
const LLM_HISTORY_TAIL = 24

const VERDICT_LABEL: Record<CoverageAnswer["verdict"], string> = {
  yes: "ДА, покрыто",
  no: "НЕТ, не покрыто",
  approval: "НУЖНО СОГЛАСОВАНИЕ СТРАХОВОЙ",
  need_guarantee: "ЗАПРОСИТЬ ГАРАНТИЙНОЕ ПИСЬМО",
  unknown: "В ПРАВИЛАХ НЕ НАЙДЕНО — уточните формулировку или запросите гарантийное письмо",
}

/** Текст ответа чата из детерминированных гейтов (LLM недоступен — обёртка §5: заданное user-facing состояние). */
export function deterministicChatAnswer(base: CoverageAnswer): string {
  const lines = [VERDICT_LABEL[base.verdict], ...base.reasons.map((r) => `• ${r}`)]
  if (base.warnings.length) lines.push(...base.warnings.map((w) => `⚠ ${w}`))
  return lines.join("\n")
}

/**
 * Диалог по правилам пациента (владелец 26.07): «просто клиника общается с ИИ» — много вопросов
 * и ответов; история хранится в БД и видна всем с доступом. ПДн в LLM не уходят — только
 * правила, статус прикрепления и сроки действующих ГП.
 */
export async function chatAboutCoverage(args: {
  patientKey: string
  orgId: string | null
  question: string
  history: { role: "user" | "assistant"; content: string }[]
}): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const card = await patientCard(args.patientKey, args.orgId)
  if (!card) return { ok: false, error: "Пациент не найден" }

  const coverage = card.state.insuranceCompanyId
    ? await resolveCoverage({
        insuranceCompanyId: card.state.insuranceCompanyId,
        services: card.state.programs,
        onDate: new Date(),
      })
    : { matchedPrograms: [], unmatched: [], fallbackProgram: null, rules: [] }

  // LLM недоступен → детерминированные гейты (прикреплён/ГП/правила/лимит) вместо отказа.
  if (!isLlmConfigured()) {
    const base = answerFromRules(card.state, coverage.rules, args.question, null, coverage.fallbackProgram)
    return { ok: true, answer: deterministicChatAnswer(base) }
  }

  // Сроки действующих ГП — чтобы ИИ мог ответить «уже согласовано, действует до …» (без ПДн).
  const gpLines = card.state.activeGuarantees
    .slice(0, 10)
    .map((g) => `- ${(g.services ?? []).join(", ") || "услуги не указаны"}${g.validUntil ? ` (действует до ${g.validUntil})` : ""}`)
    .join("\n")

  const context =
    `Пациент: ${card.state.attached ? "прикреплён" : "ОТКРЕПЛЁН"}; страховая: ${card.state.insurer ?? "—"}; ` +
    `программы: ${card.state.programs.join("; ") || "—"}.\n` +
    `Действующие гарантийные письма (${card.state.activeGuarantees.length}):\n${gpLines || "(нет)"}\n\n` +
    `Правила программы:\n${rulesDigest(coverage.rules) || "(правил нет)"}`

  const res = await chatComplete(
    [
      {
        role: "system",
        content:
          "Ты помощник врача и регистратуры клиники по ДМС. Отвечай КРАТКО и по-русски, строго по переданным " +
          "правилам программы, всегда ссылайся на пункт документа. В списке много правил ПРО РАЗНЫЕ услуги — " +
          "используй только те, что прямо относятся к услуге из вопроса; правила про другие услуги не цитируй " +
          "и не смешивай. Если прямо подходящего правила нет — скажи это честно и предложи запросить " +
          "гарантийное письмо (кнопка «Составить запрос в страховую» под чатом). Не выдумывай пункты. " +
          "Не запрашивай персональные данные. Учитывай предыдущие вопросы и ответы диалога.",
      },
      { role: "user", content: context },
      { role: "assistant", content: "Контекст принял. Задайте вопрос по покрытию." },
      ...args.history.slice(-LLM_HISTORY_TAIL),
      { role: "user", content: args.question },
    ],
    { timeoutMs: 30_000 },
  )
  if (!res.ok) {
    log.error("coverage_chat_llm_failed", { error: res.error })
    return { ok: false, error: "ИИ-чат временно недоступен — попробуйте ещё раз" }
  }
  return { ok: true, answer: res.value }
}
