import { serviceKinds, toothNumbers } from "@/lib/server/patients/service-match"
import { guaranteeCovering, type PatientState } from "@/lib/server/patients/state"

import type { ResolvedRule } from "./resolve"

// ─────────────────────────────────────────────────────────────────────
// Ядро ответа на вопрос врача/регистратуры: «можно ли сделать X пациенту за Y?»
// (бизнес-идея: core/coverage-assistant-vision.md, фаза Ф-A).
// ЧИСТАЯ логика без БД и LLM — покрыта unit-тестами. Порядок гейтов:
//   1) пациент прикреплён?  2) действующее ГП покрывает услугу?  3) правила программы;
//   4) лимит суммы. Только если правила молчат — наверх отдаётся needsLlm=true.
// Каждый ответ несёт основания (пункты) и предупреждения (Д2/Д3 — нераспознанные ГП).
// ─────────────────────────────────────────────────────────────────────

export type CoverageAnswer = {
  verdict: "yes" | "no" | "approval" | "need_guarantee" | "unknown"
  /** Основания ответа — человекочитаемые строки с пунктами документов. */
  reasons: string[]
  /** Предупреждения: нераспознанные сроки/объёмы ГП, фолбэк программы и т.п. */
  warnings: string[]
  /** Правила, на которых основан ответ (для показа в UI). */
  matchedRules: ResolvedRule[]
  /** Детерминированных данных не хватило — нужен LLM с выжимкой правил. */
  needsLlm: boolean
}

const KIND_TO_CLASSES: Record<string, string[]> = {
  имплантация: ["имплантация"],
  протезирование: ["протезирование", "стоматология-ортопедия"],
  ортодонтия: ["ортодонтия"],
  удаление: ["стоматология-хирургия"],
  эндодонтия: ["стоматология-терапия"],
  кариес: ["стоматология-терапия"],
  пародонт: ["пародонтология"],
  гигиена: ["стоматология-профилактика", "пародонтология"],
  хирургия: ["стоматология-хирургия"],
  диагностика: ["диагностика"],
  физиотерапия: ["стоматология-физио", "физиотерапия"],
  анестезия: ["стоматология-терапия", "стоматология-хирургия"],
  консультация: ["стоматология-приёмы", "амбулатория-приёмы"],
}

/** Правила, относящиеся к запрошенной услуге: по словам паттерна и по классу услуги. */
export function rulesForService(rules: ResolvedRule[], serviceText: string): ResolvedRule[] {
  const query = serviceText.toLowerCase().replace(/ё/g, "е")
  const kinds = serviceKinds(query)
  const classes = new Set([...kinds].flatMap((k) => KIND_TO_CLASSES[k] ?? []))

  const byPattern = rules.filter((r) => {
    const words = (r.servicePattern ?? "").split(/\s+/).filter((w) => w.length >= 4)
    return words.some((w) => query.includes(w.toLowerCase()))
  })
  // паттерн — точнее; класс — страховка, когда формулировка врача не совпала со словарём
  const byClass = rules.filter((r) => classes.has(r.serviceClass))
  const seen = new Set<string>()
  return [...byPattern, ...byClass].filter((r) => {
    const key = `${r.clause}|${r.servicePattern}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Сумма из лимита правила, если лимит денежный («15000», «15 000 руб», «1 000 000»). */
export function moneyLimit(rule: ResolvedRule): number | null {
  const raw = rule.limitAmount ?? ""
  if (!/руб|₽|^[\d\s]+$/.test(raw)) return null
  const digits = raw.replace(/[^\d]/g, "")
  if (digits.length < 3) return null // «4 зуба», «30%» — не деньги
  return Number(digits)
}

export function answerFromRules(
  state: PatientState,
  rules: ResolvedRule[],
  serviceText: string,
  amount: number | null,
  fallbackProgram: string | null,
): CoverageAnswer {
  const reasons: string[] = []
  const warnings: string[] = []

  // Предупреждения о качестве данных ГП (Д2/Д3): молчать нельзя.
  const noTerm = state.activeGuarantees.filter((g) => !g.validUntil).length
  const noScope = state.activeGuarantees.filter(
    (g) => g.services.length === 0 && !(g.conditions ?? "").trim(),
  ).length
  if (noTerm > 0) warnings.push(`у ${noTerm} гарантийных писем срок действия не распознан — проверьте оригинал`)
  if (noScope > 0) warnings.push(`у ${noScope} гарантийных писем объём услуг не распознан — проверьте оригинал`)
  if (fallbackProgram) {
    warnings.push(`программа в письмах не указана — применены типовые условия «${fallbackProgram}»`)
  }

  // Гейт 1: прикрепление.
  if (!state.attached) {
    return {
      verdict: "no",
      reasons: [`пациент откреплён от программы${state.since ? ` с ${state.since}` : ""} — оплата по ДМС не гарантируется`],
      warnings,
      matchedRules: [],
      needsLlm: false,
    }
  }
  reasons.push(`пациент прикреплён${state.programs.length ? ` (${state.programs.join("; ")})` : ""}`)

  // Гейт 2: действующее ГП уже покрывает услугу?
  const covering = guaranteeCovering(state, serviceText)
  if (covering) {
    const g = covering.letter
    return {
      verdict: "yes",
      reasons: [
        ...reasons,
        `есть действующее гарантийное письмо от ${g.letterDate ?? "—"}${g.validUntil ? ` (до ${g.validUntil})` : ""}: ${covering.reason}`,
        ...(g.amountLimit ? [`лимит письма: ${g.amountLimit}`] : []),
      ],
      warnings,
      matchedRules: [],
      needsLlm: false,
    }
  }

  // Гейт 3: правила программы.
  const matched = rulesForService(rules, serviceText)
  if (matched.length === 0) {
    return {
      verdict: "unknown",
      reasons: [...reasons, "в правилах программы услуга явно не названа"],
      warnings,
      matchedRules: [],
      needsLlm: true,
    }
  }

  // Порядок силы: правило программы раньше правила страховой (rules уже так отсортированы),
  // внутри — самый строгий вердикт по конкретной услуге виден первым в matched.
  const top = matched[0]
  const cite = (r: ResolvedRule) => `${r.clause ?? "—"} (${r.documentTitle})`

  // Гейт 4: денежный лимит, если задана сумма.
  if (amount != null) {
    for (const r of matched) {
      const lim = moneyLimit(r)
      if (lim != null && amount > lim) {
        return {
          verdict: "approval",
          reasons: [...reasons, `сумма ${amount} ₽ превышает лимит ${lim} ₽ — ${cite(r)}`],
          warnings,
          matchedRules: matched.slice(0, 5),
          needsLlm: false,
        }
      }
    }
  }

  const map: Record<string, CoverageAnswer["verdict"]> = {
    covered: "yes",
    excluded: "need_guarantee",
    needs_approval: "approval",
    conditional: "yes",
  }
  const verdict = map[top.verdict] ?? "unknown"
  const detail =
    top.verdict === "conditional" && top.conditionText
      ? ` — условие: ${top.conditionText}`
      : top.verdict === "excluded"
        ? " — услуга исключена из программы; оплата возможна только по отдельному согласованию (запросить гарантийное письмо)"
        : ""
  return {
    verdict,
    reasons: [...reasons, `${top.servicePattern ?? top.serviceClass}: ${verdictRu(top.verdict)}${detail} — ${cite(top)}`],
    warnings,
    matchedRules: matched.slice(0, 5),
    needsLlm: false,
  }
}

function verdictRu(v: string): string {
  return { covered: "покрыто", excluded: "не покрыто", needs_approval: "по согласованию", conditional: "покрыто при условии" }[v] ?? v
}

export { toothNumbers }
