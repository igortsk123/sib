// ─────────────────────────────────────────────────────────────────────
// Нормализация строк программ/услуг из guarantee_letter.services (план coverage-resolver).
// Страховые пишут одну программу по-разному: «"Специализированная стоматология"»,
// «Специализированная стоматология», «"Поликлиника" + "Помощь на территории России"».
// Чистая логика — покрыта unit-тестами, БД не трогает.
// ─────────────────────────────────────────────────────────────────────

/** Нормализует строку для точного матча: нижний регистр, без кавычек, схлопнутые пробелы. */
export function normalizeAlias(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[«»"'`]/g, " ")
    .replace(/ё/g, "е")
    .replace(/[\s.,;:]+$/g, "")
    .replace(/^[\s.,;:]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

type QuotedGroup = { text: string; start: number; end: number }

function quotedGroups(raw: string): QuotedGroup[] {
  const groups: QuotedGroup[] = []
  const re = /[«"]([^«»"]{3,})[»"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    groups.push({ text: m[1], start: m.index, end: m.index + m[0].length })
  }
  return groups
}

/**
 * Режет строку письма на отдельные программы. Связка через «+» остаётся одним именем:
 * «"Поликлиника" + "Помощь на территории России"» → одна программа.
 * Без кавычек строка возвращается целиком (её алиас заводится в program_alias как есть).
 */
export function splitPrograms(raw: string): string[] {
  const groups = quotedGroups(raw)
  if (groups.length === 0) {
    return raw.split(/\s*;\s*/).map(normalizeAlias).filter(isMeaningful)
  }
  const parts: string[] = []
  groups.forEach((g, i) => {
    const between = i > 0 ? raw.slice(groups[i - 1].end, g.start) : ""
    if (i > 0 && between.includes("+")) parts[parts.length - 1] += ` + ${g.text}`
    else parts.push(g.text)
  })
  return parts.map(normalizeAlias).filter(isMeaningful)
}

function isMeaningful(alias: string): boolean {
  return alias.length >= 3
}

const SERVICE_PREFIXES =
  /^(первичн|повторн|консультац|прием|приём|осмотр|удаление|лечение|вскрытие|снятие|восстановлен|эндодонт|рентген|прицельн|узи|оак|оам|как|копрограмма|дерматоскопия|микроскопия|обследование|ведение лвн|составление плана|хирургическая помощь|последующие приемы)/

/** Похоже ли значение на КОНКРЕТНУЮ УСЛУГУ: ВСК/Совкомбанк/Зетта пишут услуги, а не программы. */
export function looksLikeService(aliasNorm: string): boolean {
  return SERVICE_PREFIXES.test(aliasNorm)
}
