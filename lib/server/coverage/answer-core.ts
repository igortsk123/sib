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
  /** Вердикт зависит от условий — регистратура кликает подходящее и получает окончательный
   *  ответ (владелец 26.07: «уточнения тегами: боль острая/не острая — от этого зависит»). */
  clarifications?: { clause: string; condition: string }[]
}

/** Ответ сотрудника на уточнение: какое условие правила выполняется (или ни одно). */
export type Clarify = { condition: string; satisfied: boolean }

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

// Слова, которые есть почти в каждом стоматологическом правиле, — совпадение по ним НЕ делает
// правило относящимся к вопросу (баг 26.07: «удаление зуба 37» тянуло «восстановление
// коронковой части зуба» через слово «зуба»).
const GENERIC_WORDS = new Set([
  "зуб", "зуба", "зубов", "зубы", "зубной", "зубного", "зубных",
  "лечение", "лечения", "услуга", "услуги", "услуг", "пациент", "пациента",
  "медицинская", "медицинских", "стоматологическая", "стоматологических", "проведение",
])

/** Правила, относящиеся к запрошенной услуге: по словам паттерна и по классу услуги. */
export function rulesForService(rules: ResolvedRule[], serviceText: string): ResolvedRule[] {
  const query = serviceText.toLowerCase().replace(/ё/g, "е")
  const kinds = serviceKinds(query)
  const classes = new Set([...kinds].flatMap((k) => KIND_TO_CLASSES[k] ?? []))

  const byPattern = rules.filter((r) => {
    const words = (r.servicePattern ?? "")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w.toLowerCase().replace(/ё/g, "е")))
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

/**
 * Правило-«сноска»: «услуги, не предусмотренные программой/договором, не покрываются».
 * Есть у большинства СК (Альфа п.5.2а, Зетта п.4.4.1.1, ЭГ п.5.2.2, РГС сноска 55, Ингос п.2.7).
 * С ним «услуга в правилах не названа» превращается в ОПРЕДЕЛЁННЫЙ «НЕТ» с пунктом
 * (требование владельца: регистратура должна видеть чёткое да/нет, а не «нет явного ответа»).
 */
export function catchAllRule(rules: ResolvedRule[]): ResolvedRule | null {
  return (
    rules.find((r) => {
      if (r.verdict !== "excluded") return false
      const p = (r.servicePattern ?? "").toLowerCase()
      if (!/не предусмотренн/.test(p)) return false
      if (!/программ|договор/.test(p)) return false
      // узкие исключения про клиники/аптеки/лекарства — не общий catch-all по услугам
      return !/организаци|аптек|лекарствен|рецепт/.test(p)
    }) ?? null
  )
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
  clarify?: Clarify,
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

  const cite = (r: ResolvedRule) => `${r.clause ?? "—"} (${r.documentTitle})`

  // Гейт 3: правила программы.
  const matched = rulesForService(rules, serviceText)
  if (matched.length === 0) {
    // Тип услуги словарю ЗНАКОМ (это не опечатка/жаргон), правил на него нет, а у страховой
    // есть пункт-сноска «непредусмотренное не покрывается» → определённый НЕТ с пунктом.
    const knownKind = serviceKinds(serviceText.toLowerCase().replace(/ё/g, "е")).size > 0
    const ca = catchAllRule(rules)
    if (knownKind && ca) {
      return {
        verdict: "no",
        reasons: [
          ...reasons,
          `услуга «${serviceText}» в правилах программы прямо не названа`,
          `${ca.clause ?? "пункт правил"}: услуги, не предусмотренные программой/договором, не покрываются — ${cite(ca)}. Оплата возможна только по отдельному согласованию (запросить гарантийное письмо)`,
        ],
        warnings,
        matchedRules: [ca],
        needsLlm: false,
      }
    }
    return {
      verdict: "unknown",
      reasons: [
        ...reasons,
        `услуга «${serviceText}» в правилах не найдена${ca ? "" : ", пункта-сноски о непредусмотренных услугах у этой страховой тоже нет"} — запросите гарантийное письмо у страховой`,
      ],
      warnings,
      matchedRules: ca ? [ca] : [],
      needsLlm: true,
    }
  }

  // Порядок силы: правило программы раньше правила страховой (rules уже так отсортированы),
  // внутри — самый строгий вердикт по конкретной услуге виден первым в matched.
  const top = matched[0]

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

  // Уточнение от сотрудника (клик по тегу условия) — окончательный вердикт.
  if (clarify) {
    const rule = matched.find((r) => (r.conditionText ?? "") === clarify.condition) ?? top
    if (clarify.satisfied && clarify.condition) {
      return {
        verdict: "yes",
        reasons: [...reasons, `условие «${clarify.condition}» подтверждено сотрудником → покрыто — ${cite(rule)}`],
        warnings,
        matchedRules: [rule],
        needsLlm: false,
      }
    }
    return {
      verdict: "need_guarantee",
      reasons: [...reasons, `условия правил не выполняются (по ответу сотрудника) — оплата только по отдельному согласованию, запросите гарантийное письмо${rule.conditionText ? `; условие было: «${rule.conditionText}» — ${cite(rule)}` : ""}`],
      warnings,
      matchedRules: [rule],
      needsLlm: false,
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

  // Условные правила по этой услуге → предложить уточнения-теги (клик = окончательный ответ).
  const conditional = matched.filter((r) => r.verdict === "conditional" && (r.conditionText ?? "").trim())
  const clarifications = conditional.slice(0, 4).map((r) => ({
    clause: r.clause ?? "—",
    condition: (r.conditionText ?? "").trim(),
  }))

  return {
    verdict,
    reasons: [...reasons, `${top.servicePattern ?? top.serviceClass}: ${verdictRu(top.verdict)}${detail} — ${cite(top)}`],
    warnings,
    matchedRules: matched.slice(0, 5),
    needsLlm: false,
    ...(clarifications.length ? { clarifications } : {}),
  }
}

function verdictRu(v: string): string {
  return { covered: "покрыто", excluded: "не покрыто", needs_approval: "по согласованию", conditional: "покрыто при условии" }[v] ?? v
}

export { toothNumbers }
