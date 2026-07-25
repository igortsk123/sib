import { describe, expect, it } from "vitest"

import { applyPrecedence } from "./resolve"

type Row = Parameters<typeof applyPrecedence>[0][number]

const row = (over: Partial<Row>): Row => ({
  serviceClass: "стоматология-хирургия",
  servicePattern: "удаление зуб",
  verdict: "covered",
  conditionText: null,
  limitAmount: null,
  clause: "п. 1.1.3",
  programName: null,
  scopeLevel: "insurer",
  overridable: false,
  needsReview: false,
  documentId: "11111111-1111-1111-1111-111111111111",
  documentTitle: "Правила ДМС",
  documentUrl: null,
  effectiveFrom: null,
  ...over,
})

describe("applyPrecedence", () => {
  it("программа вытесняет переопределяемое правило СК того же класса (кейс Ингосстраха)", () => {
    const rules = applyPrecedence(
      [
        row({ verdict: "excluded", overridable: true, clause: "п. 11.23.2.14" }),
        row({ scopeLevel: "program", programName: "«Специализированная стоматология»", clause: "п. 1.1.3" }),
      ],
      [],
    )
    expect(rules).toHaveLength(1)
    expect(rules[0]).toMatchObject({ verdict: "covered", scopeLevel: "program" })
  })

  it("непереопределяемое правило СК остаётся даже при наличии программы", () => {
    const rules = applyPrecedence(
      [
        row({ verdict: "excluded", overridable: false, clause: "п. 3.2.8" }),
        row({ scopeLevel: "program", programName: "П", clause: "п. 1.1.3" }),
      ],
      [],
    )
    expect(rules).toHaveLength(2)
  })

  it("правило СК другого класса не вытесняется", () => {
    const rules = applyPrecedence(
      [
        row({ serviceClass: "имплантация", servicePattern: "имплантац", verdict: "excluded", overridable: true }),
        row({ scopeLevel: "program", programName: "П" }),
      ],
      [],
    )
    expect(rules).toHaveLength(2)
  })

  it("правила, совпавшие с запрошенной услугой, поднимаются наверх", () => {
    const rules = applyPrecedence(
      [
        row({ serviceClass: "диагностика", servicePattern: "рентген радиовизиография", verdict: "covered" }),
        row({ servicePattern: "удаление зуб", verdict: "conditional", conditionText: "4 зуба" }),
      ],
      ["удаление зуба 3.7 по медицинским показаниям"],
    )
    expect(rules[0].servicePattern).toBe("удаление зуб")
  })

  it("при равных условиях ДА идёт раньше НЕТ", () => {
    const rules = applyPrecedence(
      [row({ verdict: "excluded", clause: "a" }), row({ verdict: "covered", clause: "b" })],
      [],
    )
    expect(rules.map((r) => r.verdict)).toEqual(["covered", "excluded"])
  })
})
