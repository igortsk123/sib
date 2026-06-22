import { describe, expect, it } from "vitest"
import { INSURER_SEED } from "./insurers"

// Реестр — главный механизм идентификации страховой (ADR D10). Тест защищает
// инварианты сида: 13 страховых, у каждой есть домен, имена уникальны, домены валидны.
describe("INSURER_SEED", () => {
  it("содержит 13 страховых из корпуса", () => {
    expect(INSURER_SEED).toHaveLength(13)
  })

  it("у каждой страховой есть имя и хотя бы один домен", () => {
    for (const c of INSURER_SEED) {
      expect(c.name, JSON.stringify(c)).toBeTruthy()
      expect(c.domains && c.domains.length, `нет домена у ${c.name}`).toBeGreaterThan(0)
    }
  })

  it("имена уникальны (ключ идемпотентного сида)", () => {
    const names = INSURER_SEED.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("домены уникальны между страховыми (нет коллизий идентификации)", () => {
    const all = INSURER_SEED.flatMap((c) => c.domains ?? [])
    expect(new Set(all).size, "домен принадлежит двум страховым").toBe(all.length)
  })

  it("домены — валидные хосты в нижнем регистре", () => {
    for (const c of INSURER_SEED) {
      for (const d of c.domains ?? []) {
        expect(d, `${c.name}: ${d}`).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/)
      }
    }
  })

  it("ключевые домены из корпуса присутствуют (поиск по алиасу — name теперь официальное)", () => {
    const byAlias = (alias: string) =>
      INSURER_SEED.find((c) => c.aliases?.includes(alias) || c.name === alias)?.domains ?? []
    expect(byAlias("Балта")).toContain("calltravel.eu")
    expect(byAlias("Астро-Волга")).toContain("astrovolga.ru")
    expect(byAlias("Лучшее здоровье")).toContain("luchi.ru")
    expect(byAlias("СОГАЗ")).toContain("sogaz.ru")
  })

  it("name — официальные наименования (в кавычках с орг-формой)", () => {
    for (const c of INSURER_SEED) {
      expect(c.name, c.name).toMatch(/[«»]/)
      expect(c.aliases && c.aliases.length, `нет алиасов у ${c.name}`).toBeGreaterThan(0)
    }
  })
})
