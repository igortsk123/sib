import { describe, expect, it } from "vitest"

import type { PatientState } from "@/lib/server/patients/state"

import { answerFromRules, moneyLimit, rulesForService } from "./answer-core"
import type { ResolvedRule } from "./resolve"

const rule = (over: Partial<ResolvedRule>): ResolvedRule => ({
  serviceClass: "стоматология-хирургия",
  servicePattern: "удаление зуб простое сложное",
  verdict: "covered",
  conditionText: null,
  limitAmount: null,
  clause: "п. 2.12",
  programName: "«Стоматологическое обслуживание»",
  scopeLevel: "program",
  needsReview: false,
  documentId: "d1",
  documentTitle: "003_Правила ДМС граждан СОГАЗ",
  documentUrl: null,
  effectiveFrom: null,
  ...over,
})

const state = (over: Partial<PatientState>): PatientState => ({
  attached: true,
  programs: ["стоматология в лпу"],
  insuranceCompanyId: "ck",
  insurer: "АО «СОГАЗ»",
  since: "2026-01-10",
  activeGuarantees: [],
  expiredGuarantees: [],
  ...over,
})

const gp = (over: Record<string, unknown>) => ({
  id: "g1",
  letterDate: "2026-05-20",
  approvalStatus: "approved",
  docType: "guarantee",
  insuranceCompanyId: "ck",
  insurer: "АО «СОГАЗ»",
  services: ["Эндодонтическое лечение 25 зуба"],
  validUntil: "2099-01-01",
  amountLimit: null,
  conditions: null,
  isDuplicate: false,
  ...over,
})

describe("гейт 1: прикрепление", () => {
  it("откреплённый пациент → НЕТ, без обращения к правилам и LLM", () => {
    const a = answerFromRules(state({ attached: false, since: "2026-02-10" }), [rule({})], "удаление зуба", null, null)
    expect(a.verdict).toBe("no")
    expect(a.needsLlm).toBe(false)
    expect(a.reasons[0]).toContain("откреплён")
  })
})

describe("гейт 2: действующее ГП", () => {
  it("письмо на ту же услугу и зуб → ДА по письму", () => {
    const a = answerFromRules(state({ activeGuarantees: [gp({})] as never }), [], "эндодонтическое лечение 25 зуба", null, null)
    expect(a.verdict).toBe("yes")
    expect(a.reasons.join(" ")).toContain("гарантийное письмо")
  })

  it("письмо на другой зуб не подходит → идём к правилам", () => {
    const a = answerFromRules(
      state({ activeGuarantees: [gp({})] as never }),
      [rule({ servicePattern: "эндодонтическое лечение каналов", serviceClass: "стоматология-терапия" })],
      "эндодонтическое лечение 36 зуба",
      null,
      null,
    )
    expect(a.verdict).toBe("yes")
    expect(a.reasons.join(" ")).not.toContain("гарантийное письмо от")
  })
})

describe("гейт 3: правила программы", () => {
  it("услуга покрыта → ДА с пунктом", () => {
    const a = answerFromRules(state({}), [rule({})], "удаление зуба 3.7", null, null)
    expect(a.verdict).toBe("yes")
    expect(a.reasons.join(" ")).toContain("п. 2.12")
  })

  it("услуга исключена → НУЖЕН ЗАПРОС ГП", () => {
    const a = answerFromRules(state({}), [rule({ verdict: "excluded", servicePattern: "имплантация зуб", serviceClass: "имплантация" })], "имплантация зуба", null, null)
    expect(a.verdict).toBe("need_guarantee")
  })

  it("по согласованию → APPROVAL", () => {
    const a = answerFromRules(state({}), [rule({ verdict: "needs_approval" })], "удаление зуба", null, null)
    expect(a.verdict).toBe("approval")
  })

  it("правила молчат → unknown + needsLlm", () => {
    const a = answerFromRules(state({}), [rule({ servicePattern: "приём терапевта", serviceClass: "амбулатория-приёмы" })], "гирудотерапия", null, null)
    expect(a.verdict).toBe("unknown")
    expect(a.needsLlm).toBe(true)
  })
})

describe("гейт 4: денежный лимит", () => {
  it("сумма выше лимита → согласование", () => {
    const a = answerFromRules(state({}), [rule({ limitAmount: "15 000 руб" })], "удаление зуба", 20000, null)
    expect(a.verdict).toBe("approval")
    expect(a.reasons.join(" ")).toContain("превышает лимит")
  })

  it("«4 зуба» и «30%» — не денежный лимит, не сравнивается с суммой", () => {
    expect(moneyLimit(rule({ limitAmount: "4 зуба" }))).toBeNull()
    expect(moneyLimit(rule({ limitAmount: "30%" }))).toBeNull()
    expect(moneyLimit(rule({ limitAmount: "1 000 000" }))).toBe(1000000)
  })
})

describe("предупреждения о качестве данных (Д2/Д3)", () => {
  it("ГП без срока и без объёма дают предупреждения, а не молчание", () => {
    const a = answerFromRules(
      state({ activeGuarantees: [gp({ validUntil: null, services: [], conditions: null })] as never }),
      [rule({})],
      "удаление зуба",
      null,
      null,
    )
    expect(a.warnings.join(" ")).toContain("срок действия не распознан")
    expect(a.warnings.join(" ")).toContain("объём услуг не распознан")
  })

  it("фолбэк программы отражён предупреждением", () => {
    const a = answerFromRules(state({}), [rule({})], "удаление зуба", null, "Типовая программа РГС")
    expect(a.warnings.join(" ")).toContain("типовые условия")
  })
})

describe("rulesForService", () => {
  it("находит по классу, когда слова врача не совпали с паттерном", () => {
    const found = rulesForService([rule({ servicePattern: "экстракция зубов", serviceClass: "стоматология-хирургия" })], "удаление 8-го зуба")
    expect(found).toHaveLength(1)
  })
})
