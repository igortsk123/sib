import type { NewInsuranceCompany } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Сид реестра страховых — реальные домены из тестового корпуса
// (domain/insurer-recognition.md, ADR D10). Домен ≠ название → сид обязателен.
// `rules` — подсказки парсера на будущие срезы (где данные, формат, архив/пароль).
// Реестр редактируемый: сид идемпотентен (onConflictDoNothing по name), ручные правки не затираем.
// ─────────────────────────────────────────────────────────────────────
export const INSURER_SEED: NewInsuranceCompany[] = [
  { name: "Балта", aliases: ["Балта", "Балт Ассистанс"], domains: ["calltravel.eu"],
    rules: { where: "body+pdf", formats: ["pdf"], pdf: "text+scan(ocr)" } },
  { name: "Ингосстрах", aliases: ["Ингосстрах"], domains: ["ingos.ru"],
    rules: { where: "body|excel", formats: ["xls"], excel: "legacy-xls" } },
  { name: "Зетта", aliases: ["Зетта", "Зетта Страхование", "Зетстрахование"], domains: ["zettains.ru"],
    rules: { where: "archive", formats: ["zip"], archive: "zip->pdf", password: "separate-email", linkBy: "gp_number" } },
  { name: "Ренессанс", aliases: ["Ренессанс"], domains: ["renins.com", "renhealth.com"],
    rules: { where: "attach", formats: ["pdf", "xls"] } },
  { name: "Лучшее здоровье", aliases: ["Лучшее здоровье", "Лучи здоровье"], domains: ["luchi.ru"],
    rules: { where: "body", formats: [] } },
  { name: "Астро-Волга", aliases: ["Астро-Волга", "Астра-Волга"], domains: ["astrovolga.ru"],
    rules: { where: "body", formats: [], note: "From часто срезан — ID по телу" } },
  { name: "РЕСО", aliases: ["РЕСО", "РЕСО-Гарантия"], domains: ["reso.ru"],
    rules: { where: "attach", formats: ["xlsx", "rtf"], excel: "registry-multirow" } },
  { name: "ВСК", aliases: ["ВСК"], domains: ["vsk.ru"],
    rules: { where: "attach", formats: ["pdf"], pdf: "text" } },
  { name: "СОГАЗ", aliases: ["СОГАЗ"], domains: ["sogaz.ru"],
    rules: { where: "body|excel", formats: ["xls"], excel: "legacy-xls" } },
  { name: "Энергогарант", aliases: ["Энергогарант"], domains: ["energogarant.ru"],
    rules: { where: "body", formats: [], note: "ID по телу (рядом домены клиник)" } },
  { name: "Совкомбанк", aliases: ["Совкомбанк", "Совкомбанк Страхование"], domains: ["sovcomins.ru"],
    rules: { where: "body+pdf", formats: ["pdf"], pdf: "text" } },
  { name: "Росгосстрах", aliases: ["Росгосстрах"], domains: ["rgs.ru"],
    rules: { where: "archive|body", formats: ["zip", "pdf"], archive: "zip->xls", password: "separate-email|body(rgs...)" } },
  { name: "АльфаСтрахование", aliases: ["АльфаСтрахование", "Альфа"], domains: ["alfastrah.ru"],
    rules: { where: "body|excel", formats: ["xlsx"], excel: "registry-multirow" } },
]
