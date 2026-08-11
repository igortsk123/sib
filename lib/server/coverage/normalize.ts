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
 * Режет строку письма на ОТДЕЛЬНЫЕ программы: «"Поликлиника" + "Поликлиническая помощь на
 * территории России" "Специализированная стоматология"» → три самостоятельные программы.
 * Каждая называется так, как её называет страховая, — их правила ищутся по отдельности.
 */
export function splitPrograms(raw: string): string[] {
  const groups = quotedGroups(raw)
  const parts = groups.length > 0 ? groups.map((g) => g.text) : splitOutsideParens(raw)
  return parts.map(normalizeAlias).filter(isMeaningful)
}

/**
 * Режет по «;»/«+», НО не внутри скобок: «ДМС Стандарт (поликлиника + стоматология)» — это одна
 * программа, а не «дмс стандарт (поликлиника» и «стоматология)». На проде такой разрыв давал
 * две несуществующие программы на 250 пациентов каждая и занижал долю найденных правил.
 */
function splitOutsideParens(raw: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of raw) {
    if (ch === "(") depth++
    else if (ch === ")") depth = Math.max(0, depth - 1)
    if ((ch === ";" || ch === "+") && depth === 0) {
      parts.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  parts.push(cur)
  return parts.map((p) => p.trim()).filter(Boolean)
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
