// ─────────────────────────────────────────────────────────────────────
// Сопоставление «что собирается делать врач» ↔ «что покрыто гарантийным письмом».
// Нужно для ответа: письма достаточно или требуется запросить новое (кейс владельца —
// в процессе лечения выяснилось, что нужно больше, чем согласовано).
// Наивное сравнение по словам не годится: «имплантация зуба» и «лечение 25 зуба» имеют
// общее слово «зуба», но это разные услуги. Сравниваем ТИП вмешательства и НОМЕР зуба.
// ─────────────────────────────────────────────────────────────────────

const SERVICE_KINDS: { kind: string; re: RegExp }[] = [
  { kind: "имплантация", re: /имплант/i },
  { kind: "протезирование", re: /протезир|коронк|мостовид|вкладк|винир/i },
  { kind: "ортодонтия", re: /ортодонт|брекет|элайнер/i },
  { kind: "удаление", re: /удален|экстракц|вылущиван/i },
  { kind: "эндодонтия", re: /эндодонт|канал|пульпит|периодонтит|депульпир|распломбир/i },
  { kind: "кариес", re: /кариес|пломб|реставрац|восстановлен\w* коронк/i },
  { kind: "пародонт", re: /пародонт|кюретаж|десн|гингивит/i },
  { kind: "гигиена", re: /зубн\w*\s+камн|налет|налёт|гигиен|фторлак|фторирован/i },
  { kind: "хирургия", re: /абсцесс|разрез|периостит|цистэктом|резекц\w*\s+верхушк|капюшон|остеотом/i },
  { kind: "диагностика", re: /рентген|снимок|снимк|визиограф|ортопантомограм|томограф/i },
  { kind: "физиотерапия", re: /физиотерап|физиолечен/i },
  { kind: "анестезия", re: /анестез|наркоз|обезболиван/i },
  { kind: "консультация", re: /консультац|прием|приём|осмотр/i },
]

/** Типы вмешательств, упомянутые в тексте. */
export function serviceKinds(text: string): Set<string> {
  const found = new Set<string>()
  for (const { kind, re } of SERVICE_KINDS) if (re.test(text)) found.add(kind)
  return found
}

/**
 * Номера зубов из текста: «25 зуба», «зуб 36,46», «3.6», «зубы 12, 13».
 * Возвращает двузначные номера по международной схеме (11–48).
 */
export function toothNumbers(text: string): Set<string> {
  const teeth = new Set<string>()
  const dotted = text.matchAll(/\b([1-4])\.([1-8])\b/g)
  for (const m of dotted) teeth.add(`${m[1]}${m[2]}`)
  // «25 зуба», «зуб 36,46», «зубов 17 и 18»
  const near = text.matchAll(/(?:зуб\w*\s*)((?:\d{2}[\s,и]*)+)|((?:\d{2}[\s,]*)+)(?=\s*зуб)/gi)
  for (const m of near) {
    for (const num of (m[1] ?? m[2] ?? "").matchAll(/\d{2}/g)) {
      const n = num[0]
      if (/^[1-4][1-8]$/.test(n)) teeth.add(n)
    }
  }
  return teeth
}

/** Письмо «всё по назначению врача» покрывает что угодно в пределах программы. */
export function isBlanket(text: string): boolean {
  return /вс[её]\s+по\s+назначению\s+врача|в\s+объеме\s+программы|в\s+объёме\s+программы/i.test(text)
}

export type MatchResult = { covered: boolean; reason: string }

/** Покрывает ли согласованное (текст ГП) то, что запрашивает врач. */
export function matchesGuarantee(guaranteeText: string, request: string): MatchResult {
  if (isBlanket(guaranteeText)) return { covered: true, reason: "письмо выдано на объём по назначению врача" }

  const gKinds = serviceKinds(guaranteeText)
  const rKinds = serviceKinds(request)
  const sameKind = [...rKinds].filter((k) => gKinds.has(k))
  if (rKinds.size > 0 && sameKind.length === 0) {
    return { covered: false, reason: `в письме нет этой услуги (${[...rKinds].join(", ") || "услуга не распознана"})` }
  }

  const gTeeth = toothNumbers(guaranteeText)
  const rTeeth = toothNumbers(request)
  if (gTeeth.size > 0 && rTeeth.size > 0) {
    const same = [...rTeeth].filter((t) => gTeeth.has(t))
    if (same.length === 0) {
      return { covered: false, reason: `письмо на зуб(ы) ${[...gTeeth].join(", ")}, а лечим ${[...rTeeth].join(", ")}` }
    }
  }
  if (rKinds.size === 0 && gTeeth.size === 0) {
    return { covered: false, reason: "услуга не распознана — сверьте с текстом письма" }
  }
  return { covered: true, reason: "услуга совпадает с согласованной в письме" }
}
