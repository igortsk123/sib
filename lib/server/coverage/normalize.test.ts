import { describe, expect, it } from "vitest"

import { looksLikeService, normalizeAlias, splitPrograms } from "./normalize"

describe("normalizeAlias", () => {
  it("снимает кавычки, регистр и хвостовые знаки", () => {
    expect(normalizeAlias('"Специализированная стоматология"')).toBe("специализированная стоматология")
    expect(normalizeAlias("Амб. взрослые; Стоматология в ЛПУ ")).toBe("амб. взрослые; стоматология в лпу")
  })

  it("схлопывает пробелы и приводит ё к е", () => {
    expect(normalizeAlias("Поликлиника   для   детей")).toBe("поликлиника для детей")
    expect(normalizeAlias("Приём стоматолога")).toBe("прием стоматолога")
  })
})

describe("splitPrograms", () => {
  it("разбивает связку через + на отдельные программы", () => {
    expect(splitPrograms('"Поликлиника" + "Поликлиническая помощь на территории России"')).toEqual([
      "поликлиника",
      "поликлиническая помощь на территории россии",
    ])
  })

  it("разделяет программы, перечисленные подряд в кавычках", () => {
    expect(
      splitPrograms('"Поликлиника" + "Поликлиническая помощь на территории России" "Специализированная стоматология"'),
    ).toEqual([
      "поликлиника",
      "поликлиническая помощь на территории россии",
      "специализированная стоматология",
    ])
  })

  it("без кавычек режет по точке с запятой", () => {
    expect(splitPrograms("Амб. взрослые; Стоматология в ЛПУ")).toEqual(["амб. взрослые", "стоматология в лпу"])
  })
})

describe("looksLikeService", () => {
  it("распознаёт услуги из писем ВСК/Совкомбанка", () => {
    expect(looksLikeService("удаление ретинированных и дистопированных зубов")).toBe(true)
    expect(looksLikeService("первичный прием стоматолога (терапевта, хирурга)")).toBe(true)
    expect(looksLikeService("оак")).toBe(true)
  })

  it("не считает услугой название программы", () => {
    expect(looksLikeService("специализированная стоматология")).toBe(false)
    expect(looksLikeService("амб. взрослые; стоматология в лпу")).toBe(false)
    expect(looksLikeService("томск_максимум_3г")).toBe(false)
  })
})
