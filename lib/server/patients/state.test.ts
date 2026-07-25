import { describe, expect, it } from "vitest"

import { computePatientState, guaranteeCovering, patientKey, type PatientLetter } from "./state"

const letter = (over: Partial<PatientLetter>): PatientLetter => ({
  id: Math.random().toString(36).slice(2),
  letterDate: "2026-01-01",
  approvalStatus: "enroll",
  docType: "enroll",
  insuranceCompanyId: "ck-1",
  insurer: "СПАО «Ингосстрах»",
  services: ["«Специализированная стоматология»"],
  validUntil: null,
  amountLimit: null,
  conditions: null,
  isDuplicate: false,
  ...over,
})

const TODAY = new Date("2026-06-01")

describe("patientKey", () => {
  it("одинаков для разного регистра и ё/е, разный для разных дат рождения", () => {
    expect(patientKey("Иванов Иван Иванович", "1980-05-01")).toBe(patientKey("иванов  иван иванович", "1980-05-01"))
    expect(patientKey("Семёнов Пётр", "1980-05-01")).toBe(patientKey("Семенов Петр", "1980-05-01"))
    expect(patientKey("Иванов Иван", "1980-05-01")).not.toBe(patientKey("Иванов Иван", "1981-05-01"))
  })

  it("не содержит персональных данных", () => {
    const key = patientKey("Иванов Иван Иванович", "1980-05-01")
    expect(key).toMatch(/^[0-9a-f]{24}$/)
  })
})

describe("computePatientState", () => {
  it("после открепления пациент не числится прикреплённым", () => {
    const st = computePatientState(
      [
        letter({ letterDate: "2026-01-10", approvalStatus: "enroll" }),
        letter({ letterDate: "2026-02-10", approvalStatus: "detach", docType: "detach" }),
      ],
      TODAY,
    )
    expect(st.attached).toBe(false)
    expect(st.programs).toEqual([])
    expect(st.since).toBe("2026-02-10")
  })

  it("после повторного прикрепления берёт программу из последнего прикрепления", () => {
    const st = computePatientState(
      [
        letter({ letterDate: "2026-01-10", approvalStatus: "enroll", services: ["«Поликлиника»"] }),
        letter({ letterDate: "2026-02-10", approvalStatus: "detach", docType: "detach" }),
        letter({ letterDate: "2026-03-10", approvalStatus: "enroll", services: ["«Специализированная стоматология»"] }),
      ],
      TODAY,
    )
    expect(st.attached).toBe(true)
    expect(st.programs).toEqual(["«Специализированная стоматология»"])
  })

  it("дубли писем не влияют на состояние", () => {
    const st = computePatientState(
      [
        letter({ letterDate: "2026-03-10", approvalStatus: "enroll" }),
        letter({ letterDate: "2026-04-10", approvalStatus: "detach", docType: "detach", isDuplicate: true }),
      ],
      TODAY,
    )
    expect(st.attached).toBe(true)
  })

  it("делит гарантийные письма на действующие и истёкшие", () => {
    const st = computePatientState(
      [
        letter({ letterDate: "2026-01-05", approvalStatus: "approved", docType: "guarantee", validUntil: "2026-02-05", services: ["Эндодонтическое лечение 25 зуба"] }),
        letter({ letterDate: "2026-05-20", approvalStatus: "approved", docType: "guarantee", validUntil: "2026-07-20", services: ["Удаление зуба 3.6"] }),
      ],
      TODAY,
    )
    expect(st.expiredGuarantees).toHaveLength(1)
    expect(st.activeGuarantees).toHaveLength(1)
    expect(st.activeGuarantees[0].services).toEqual(["Удаление зуба 3.6"])
  })
})

describe("guaranteeCovering", () => {
  const state = computePatientState(
    [
      letter({ letterDate: "2026-05-20", approvalStatus: "approved", docType: "guarantee", validUntil: "2026-07-20", services: ["Эндодонтическое лечение 25 зуба"] }),
    ],
    TODAY,
  )

  it("находит письмо по совпадению услуги и номера зуба", () => {
    expect(guaranteeCovering(state, "эндодонтическое лечение 25 зуба")).not.toBeNull()
  })

  it("не находит письмо на тот же тип услуги, но ДРУГОЙ зуб — нужен новый запрос", () => {
    expect(guaranteeCovering(state, "эндодонтическое лечение 36 зуба")).toBeNull()
  })

  it("не находит письмо на другую услугу — понадобится новый запрос", () => {
    expect(guaranteeCovering(state, "имплантация зуба")).toBeNull()
  })

  it("письмо «всё по назначению врача» покрывает любую услугу", () => {
    const wide = computePatientState(
      [letter({ letterDate: "2026-05-20", approvalStatus: "approved", docType: "guarantee", validUntil: "2026-07-20", services: ["всё по назначению врача"] })],
      TODAY,
    )
    expect(guaranteeCovering(wide, "имплантация зуба")).not.toBeNull()
  })
})
