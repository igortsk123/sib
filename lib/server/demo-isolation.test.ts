import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// ─────────────────────────────────────────────────────────────────────
// Сторож границы контуров (ADR D50). Требование владельца: «чтоб в рабочий контур ничего не
// попадало из демо». Правило легко забыть в новом запросе — так и случилось со страницами
// покрытия и разделом «Пациенты», где режим «все клиники» молча включал демо-стенд.
//
// Тест читает исходники: модуль, который выбирает записи из guarantee_letter, ОБЯЗАН брать
// ограничение по клинике из lib/server/demo-org.ts. Исключения — только явные, со смыслом.
// ─────────────────────────────────────────────────────────────────────

const ROOT = join(process.cwd(), "lib", "server")
/** Скрипты вне lib/server, которые тоже считают рабочий контур (ТГ-дайджест). */
const EXTRA = [join(process.cwd(), "lib", "db", "seed", "tg-digest.ts")]

/** Модули, которым фильтр по клинике не нужен, — с причиной, почему это безопасно. */
const ALLOWED = new Map<string, string>([
  [
    "templates/actions.ts",
    "точечный UPDATE по (страховая, тип документа) при активации шаблона — не выборка для показа",
  ],
  [
    "error-reports/queries.ts",
    "техотчёты об ошибках распознавания: свои таблицы, записи реестра не выбирает",
  ],
])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : []
  })
}

describe("граница контуров: демо не попадает в рабочий", () => {
  const files = [...walk(ROOT), ...EXTRA]

  it("каждый модуль, читающий записи реестра, ограничивает выборку через orgScope", () => {
    const offenders: string[] = []
    for (const file of files) {
      const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file.slice(process.cwd().length + 1)
      if (rel === "demo-org.ts" || ALLOWED.has(rel)) continue
      const src = readFileSync(file, "utf8")
      const readsLetters =
        /\bfrom\(guaranteeLetter\)/.test(src) || /from guarantee_letter/i.test(src)
      if (!readsLetters) continue
      if (!/from "@\/lib\/server\/demo-org"/.test(src)) offenders.push(rel)
    }
    expect(
      offenders,
      `модули читают guarantee_letter в обход границы контуров (ADR D50): ${offenders.join(", ")}.
Возьми ограничение по клинике из lib/server/demo-org.ts (orgScope) или добавь модуль в ALLOWED с причиной.`,
    ).toEqual([])
  })

  it("исключения из правила не протухли — перечисленные модули существуют", () => {
    for (const rel of ALLOWED.keys()) {
      expect(() => statSync(join(ROOT, rel)), `в ALLOWED указан несуществующий ${rel}`).not.toThrow()
    }
  })

  it("правило границы задано ровно в одном месте", () => {
    const copies = files.filter((f) => {
      const rel = f.startsWith(ROOT) ? f.slice(ROOT.length + 1) : f.slice(process.cwd().length + 1)
      return rel !== "demo-org.ts" && /is_demo|Демо-клиника/.test(readFileSync(f, "utf8"))
    })
    expect(
      copies.map((f) => (f.startsWith(ROOT) ? f.slice(ROOT.length + 1) : f.slice(process.cwd().length + 1))),
      "признак демо-организации должен проверяться только в lib/server/demo-org.ts",
    ).toEqual([])
  })
})
