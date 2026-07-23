import { describe, it, expect } from "vitest"

import { dupKey } from "./shared"

// S11 (ADR D6): дубли помечаем, не удаляем. Ключ строится только при ПОЛНЫХ полях —
// пустой пациент/полис/тип не должен склеивать разные записи в «дубль».
describe("dupKey — ключ дубля записи", () => {
  const base = { insurerId: "ins-1", patient: "Иванов Иван", policy: "Пр1234567", docType: "enroll", letterDate: "2026-01-12" }

  it("одинаковые записи → одинаковый ключ (регистр/пробелы ФИО не важны)", () => {
    expect(dupKey(base)).toBe(dupKey({ ...base, patient: "  ИВАНОВ ИВАН " }))
  })

  it("разный полис/тип/страховая/дата → разный ключ", () => {
    expect(dupKey(base)).not.toBe(dupKey({ ...base, policy: "Пр7654321" }))
    expect(dupKey(base)).not.toBe(dupKey({ ...base, docType: "detach" }))
    expect(dupKey(base)).not.toBe(dupKey({ ...base, insurerId: "ins-2" }))
    expect(dupKey(base)).not.toBe(dupKey({ ...base, letterDate: "2026-01-13" }))
  })

  it("нет даты письма — ключ всё равно есть (дата опциональна)", () => {
    expect(dupKey({ ...base, letterDate: null })).toBeTruthy()
  })

  it("неполный ключ (пациент/полис/тип/страховая пусты) → null, не дубль", () => {
    expect(dupKey({ ...base, patient: null })).toBeNull()
    expect(dupKey({ ...base, patient: "  " })).toBeNull()
    expect(dupKey({ ...base, policy: null })).toBeNull()
    expect(dupKey({ ...base, docType: null })).toBeNull()
    expect(dupKey({ ...base, insurerId: null })).toBeNull()
  })
})
