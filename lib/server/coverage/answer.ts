import "server-only"

import { log } from "@/lib/log"
import { chatComplete, isLlmConfigured } from "@/lib/server/llm/openai"
import { patientCard } from "@/lib/server/patients/queries"

import { answerFromRules, type CoverageAnswer } from "./answer-core"
import { resolveCoverage } from "./resolve"

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

export async function answerCoverageQuestion(args: {
  patientKey: string
  orgId: string | null
  serviceText: string
  amount: number | null
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

  const base = answerFromRules(card.state, coverage.rules, args.serviceText, args.amount, coverage.fallbackProgram)
  if (!base.needsLlm) return { ...base, patientFound: true }

  // Детерминированно не ответили — пробуем mini-LLM с выжимкой правил (без ПДн).
  if (!isLlmConfigured() || coverage.rules.length === 0) {
    return { ...base, patientFound: true }
  }
  const digest = coverage.rules
    .slice(0, 60)
    .map((r) => `- [${r.verdict}] ${r.servicePattern ?? r.serviceClass}${r.conditionText ? ` (условие: ${r.conditionText})` : ""}${r.limitAmount ? ` (лимит: ${r.limitAmount})` : ""} — ${r.clause}`)
    .join("\n")
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
