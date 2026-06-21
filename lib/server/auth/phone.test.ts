import { describe, expect, it } from "vitest"
import { normalizePhone } from "./phone"

describe("normalizePhone", () => {
  it("приводит разные формы РФ-номера к +7XXXXXXXXXX", () => {
    expect(normalizePhone("+79234097976")).toBe("+79234097976")
    expect(normalizePhone("89234097976")).toBe("+79234097976")
    expect(normalizePhone("9234097976")).toBe("+79234097976")
    expect(normalizePhone("+7 (923) 409-79-76")).toBe("+79234097976")
  })
  it("возвращает null на мусоре", () => {
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone("123")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})
