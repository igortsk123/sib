import { describe, it, expect } from "vitest"

import { cellText, CELL_ABSENT, CELL_UNREADABLE } from "./letter-status"

// S0 (ADR D18): «нет данных» (проверено — нет в источнике) отличается от «не распознано» (тех.сбой)
// и от пустой ячейки старых записей (без статуса). Значение всегда приоритетнее статуса.
describe("cellText — отображение поля с учётом field_status", () => {
  it("значение есть → показываем значение (даже если статус absent)", () => {
    expect(cellText("6923048-19/19", "found")).toBe("6923048-19/19")
    expect(cellText("X", "absent")).toBe("X")
  })

  it("пусто + absent → «нет данных»", () => {
    expect(cellText("", "absent")).toBe(CELL_ABSENT)
    expect(cellText(null, "absent")).toBe(CELL_ABSENT)
    expect(cellText(undefined, "absent")).toBe(CELL_ABSENT)
    expect(cellText("   ", "absent")).toBe(CELL_ABSENT) // только пробелы = пусто
  })

  it("пусто + unreadable → «не распознано»", () => {
    expect(cellText(null, "unreadable")).toBe(CELL_UNREADABLE)
  })

  it("пусто без статуса → пустая строка (обратная совместимость)", () => {
    expect(cellText(null)).toBe("")
    expect(cellText("", null)).toBe("")
    expect(cellText(null, "found")).toBe("") // found без значения = пусто
    expect(cellText(null, "какой-то-мусор")).toBe("")
  })

  it("обрезает пробелы у значения", () => {
    expect(cellText("  12345  ")).toBe("12345")
  })
})
