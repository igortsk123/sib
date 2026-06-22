import type { NewInsuranceCompany } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Сид реестра страховых — реальные домены из тестового корпуса
// (domain/insurer-recognition.md, ADR D10). Домен ≠ название → сид обязателен.
// `rules` — подсказки парсера на будущие срезы (где данные, формат, архив/пароль).
// Реестр редактируемый: сид идемпотентен (onConflictDoNothing по name), ручные правки не затираем.
// ─────────────────────────────────────────────────────────────────────
// name — ОФИЦИАЛЬНОЕ наименование (видно в реестре/админке/Excel). aliases включают короткие имена
// корпуса (по ним матчит сид и распознавание датасета). Сид идемпотентен по ДОМЕНУ (run.ts) — обновляет name.
export const INSURER_SEED: NewInsuranceCompany[] = [
  { name: "ООО «Балт Ассистанс»", aliases: ["Балта", "Балт Ассистанс"], domains: ["calltravel.eu"],
    rules: { where: "body+pdf", formats: ["pdf"], pdf: "text+scan(ocr)" } },
  { name: "СПАО «Ингосстрах»", aliases: ["Ингосстрах"], domains: ["ingos.ru"],
    rules: { where: "body|excel", formats: ["xls"], excel: "legacy-xls" } },
  { name: "ООО «Зетта Страхование»", aliases: ["Зетта", "Зетта Страхование", "Зетстрахование"], domains: ["zettains.ru"],
    rules: { where: "archive", formats: ["zip"], archive: "zip->pdf", password: "separate-email", linkBy: "gp_number" } },
  { name: "ПАО «Группа Ренессанс Страхование»", aliases: ["Ренессанс", "Ренессанс Страхование"], domains: ["renins.com", "renhealth.com"],
    rules: { where: "attach", formats: ["pdf", "xls"] } },
  { name: "ООО «Лучи Здоровье»", aliases: ["Лучшее здоровье", "Лучи Здоровье", "Лучи здоровье"], domains: ["luchi.ru"],
    rules: { where: "body", formats: [] } },
  { name: "АО «СК «Астра-Волга»", aliases: ["Астро-Волга", "Астра-Волга"], domains: ["astrovolga.ru"],
    rules: { where: "body", formats: [], note: "From часто срезан — ID по телу" } },
  { name: "СПАО «РЕСО-Гарантия»", aliases: ["РЕСО", "РЕСО-Гарантия"], domains: ["reso.ru"],
    rules: { where: "attach", formats: ["xlsx", "rtf"], excel: "registry-multirow" } },
  { name: "САО «ВСК»", aliases: ["ВСК"], domains: ["vsk.ru"],
    rules: { where: "attach", formats: ["pdf"], pdf: "text" } },
  { name: "АО «СОГАЗ»", aliases: ["СОГАЗ"], domains: ["sogaz.ru"],
    rules: { where: "body|excel", formats: ["xls"], excel: "legacy-xls" } },
  { name: "ПАО «САК «ЭНЕРГОГАРАНТ»", aliases: ["Энергогарант"], domains: ["energogarant.ru"],
    rules: { where: "body", formats: [], note: "ID по телу (рядом домены клиник)" } },
  { name: "АО «Совкомбанк Страхование»", aliases: ["Совкомбанк", "Совкомбанк Страхование"], domains: ["sovcomins.ru"],
    rules: { where: "body+pdf", formats: ["pdf"], pdf: "text" } },
  { name: "ПАО СК «Росгосстрах»", aliases: ["Росгосстрах"], domains: ["rgs.ru"],
    rules: { where: "archive|body", formats: ["zip", "pdf"], archive: "zip->xls", password: "separate-email|body(rgs...)" } },
  { name: "АО «АльфаСтрахование»", aliases: ["АльфаСтрахование", "Альфа"], domains: ["alfastrah.ru"],
    rules: { where: "body|excel", formats: ["xlsx"], excel: "registry-multirow" } },
]
