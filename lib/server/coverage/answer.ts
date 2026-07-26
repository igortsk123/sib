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
          "Отвечай строго по правилам из списка; если правила не позволяют сделать вывод — verdict=unknown. " +
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

/**
 * Диалог по правилам пациента (владелец 26.07): сотрудник доуточняет вопрос в чате,
 * контекст правил уже подгружен. ПДн в LLM не уходят — только правила и статус прикрепления.
 */
export async function chatAboutCoverage(args: {
  patientKey: string
  orgId: string | null
  question: string
  history: { role: "user" | "assistant"; content: string }[]
}): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const card = await patientCard(args.patientKey, args.orgId)
  if (!card) return { ok: false, error: "Пациент не найден" }
  if (!isLlmConfigured()) return { ok: false, error: "ИИ-чат недоступен — задайте вопрос по документам из карточки" }

  const coverage = card.state.insuranceCompanyId
    ? await resolveCoverage({
        insuranceCompanyId: card.state.insuranceCompanyId,
        services: card.state.programs,
        onDate: new Date(),
      })
    : { matchedPrograms: [], unmatched: [], fallbackProgram: null, rules: [] }

  const context =
    `Пациент: ${card.state.attached ? "прикреплён" : "ОТКРЕПЛЁН"}; страховая: ${card.state.insurer ?? "—"}; ` +
    `программы: ${card.state.programs.join("; ") || "—"}; действующих ГП: ${card.state.activeGuarantees.length}.\n\n` +
    `Правила программы:\n${rulesDigest(coverage.rules) || "(правил нет)"}`

  const res = await chatComplete(
    [
      {
        role: "system",
        content:
          "Ты помощник регистратуры клиники по ДМС. Отвечай КРАТКО и по-русски, строго по переданным " +
          "правилам программы, всегда ссылайся на пункт. Если правила не позволяют сделать вывод — так и скажи " +
          "и предложи запросить гарантийное письмо. Не выдумывай пункты. Не запрашивай персональные данные.",
      },
      { role: "user", content: context },
      { role: "assistant", content: "Контекст принял. Задайте вопрос по покрытию." },
      ...args.history.slice(-8),
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
