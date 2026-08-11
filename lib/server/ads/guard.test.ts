import { describe, expect, it } from "vitest"

import { blocks, buildProtection, filterRoots, isCore, words } from "./guard"
import { findConflicts } from "./watchdog"

// Предохранитель — единственное, что стоит между LLM и боевым рекламным аккаунтом,
// поэтому покрыт построчно: цена ложного минуса — навсегда срезанный целевой спрос.

const ACTIVE = ['"гарантийные письма страховых"', "учет гарантийных писем", "---autotargeting"]
const PROTECTION = buildProtection(ACTIVE)

describe("words / isCore", () => {
  it("режет строку на слова и опускает регистр", () => {
    expect(words("Личный Кабинет РЕСО!")).toEqual(["личный", "кабинет", "ресо"])
  })
  it("узнаёт ядро ниши в любой словоформе", () => {
    expect(isCore("клиниками")).toBe(true)
    expect(isCore("поликлинику")).toBe(true)
    expect(isCore("согласования")).toBe(true)
    expect(isCore("пострадавшим")).toBe(false)
  })
})

describe("blocks — эмуляция минус-фразы Директа", () => {
  it("ловит словоформу", () => {
    expect(blocks("пострадавш", "может страховая пойти на согласование с пострадавшим")).toBe(true)
    expect(blocks("запчаст", "покупки запчастей по страховому случаю")).toBe(true)
  })
  it("фраза срабатывает только если есть ВСЕ её слова", () => {
    expect(blocks("дмс сотрудников", "как работает дмс для сотрудников от работодателя")).toBe(true)
    expect(blocks("дмс сотрудников", "учет гарантийных писем дмс")).toBe(false)
  })
  it("не путает разные слова с общим началом", () => {
    // главная ловушка: «автомоб» не должен блокировать «автоматизацию»
    expect(blocks("автомоб", "автоматизация дмс")).toBe(false)
    expect(blocks("автомоб", "ремонт автомобиля по каско")).toBe(true)
  })
})

describe("filterRoots — что робот НЕ имеет права применить", () => {
  const base = { protection: PROTECTION, corpus: [], paid: [] }

  it("пропускает нормальный маркер класса", () => {
    const { accepted } = filterRoots({ ...base, roots: ["пострадавш", "личный кабинет"] })
    expect(accepted).toEqual(["пострадавш", "личный кабинет"])
  })

  it("режет одиночное слово из ядра ниши", () => {
    const { rejected } = filterRoots({ ...base, roots: ["клиниками", "письмо", "согласование"] })
    expect(rejected.map((r) => r.root)).toEqual(["клиниками", "письмо", "согласование"])
    expect(rejected[0]!.reason).toContain("ядро ниши")
  })

  it("режет фразу, целиком состоящую из слов ядра", () => {
    const { rejected } = filterRoots({ ...base, roots: ["согласование дмс"] })
    expect(rejected[0]!.reason).toBe("фраза целиком из ядра ниши")
  })

  it("режет общеязыковые слова", () => {
    const { accepted, rejected } = filterRoots({ ...base, roots: ["что", "где", "врач"] })
    expect(accepted).toEqual([])
    expect(rejected).toHaveLength(3)
  })

  it("режет корень, который заблокировал бы активную фразу кампании", () => {
    const { rejected } = filterRoots({ ...base, roots: ["страховых"] })
    expect(rejected[0]!.reason).toContain("ядро ниши")
    const { rejected: r2 } = filterRoots({ ...base, roots: ["почта"] })
    expect(r2[0]!.reason).toContain("заблокировал бы")
  })

  it("режет корень, который заблокировал бы канарейку (целевой запрос будущего)", () => {
    const { rejected } = filterRoots({
      protection: PROTECTION,
      roots: ["пришло за месяц"],
    })
    expect(rejected[0]!.reason).toContain("заблокировал бы")
  })

  it("не дублирует уже применённые минусы", () => {
    const { rejected } = filterRoots({ ...base, roots: ["пострадавш"], existing: ["!пострадавш"] })
    expect(rejected[0]!.reason).toBe("уже есть")
  })

  it("одиночный корень должен быть маркером класса: ≥2 запроса или платный клик", () => {
    const corpus = ["сколько стоит осаго", "каско на новую машину"]
    const one = filterRoots({ ...base, roots: ["каско"], corpus })
    expect(one.rejected[0]!.reason).toContain("не маркер класса")

    const two = filterRoots({ ...base, roots: ["каско"], corpus: [...corpus, "каско цена"] })
    expect(two.accepted).toEqual(["каско"])

    const paid = filterRoots({ ...base, roots: ["каско"], corpus, paid: ["каско на новую машину"] })
    expect(paid.accepted).toEqual(["каско"])
  })

  it("дедуплицирует и нормализует ввод", () => {
    const { accepted } = filterRoots({ ...base, roots: ["Личный Кабинет", "личный кабинет"] })
    expect(accepted).toEqual(["личный кабинет"])
  })

  it("режет слишком длинные и слишком короткие корни", () => {
    const { rejected } = filterRoots({ ...base, roots: ["счет 76 01 01", "лк"] })
    expect(rejected.map((r) => r.reason)).toEqual(["длиннее 3 слов", "слишком короткий"])
  })
})

describe("findConflicts — самопроверка действующего минус-листа", () => {
  it("замечает, что применённый минус режет защищённую фразу", () => {
    const conflicts = findConflicts(["!пришло", "пострадавш"], ["сколько писем пришло за месяц"])
    expect(conflicts).toEqual([{ minus: "пришло", phrase: "сколько писем пришло за месяц" }])
  })
})
