// Человеческие подсказки для пометки «требует проверки глазами».
// reviewNote из пайплайна — список ТЕХНИЧЕСКИХ имён полей («patientBirthDate, docType»), непонятных
// сотруднику клиники. Здесь маппим их в понятные формулировки и собираем читаемую фразу.

export const FIELD_HINTS: Record<string, string> = {
  patientFullName: "ФИО пациента",
  patientBirthDate: "дата рождения пациента",
  policyNumber: "номер полиса ДМС",
  policySeries: "серия полиса",
  letterNumber: "номер гарантийного письма (№ ГП)",
  caseNumber: "номер обращения/направления",
  contractNumber: "номер договора страхования",
  docType: "тип документа",
  approvalStatus: "статус",
  letterDate: "дата письма",
  coverageFrom: "дата начала обслуживания",
  coverageTo: "дата окончания обслуживания",
  validUntil: "срок действия письма",
  amountLimit: "ограничение по сумме",
  conditions: "условия / ограничения покрытия",
  services: "услуги / диагнозы",
}

// Значения статусов — тоже словами: заметку читает менеджер, а не разработчик.
const STATUS_HINTS: Record<string, string> = {
  approved: "«гарантия оплаты»",
  referral: "«направление»",
  enroll: "«прикрепление»",
  detach: "«открепление»",
  annul: "«аннулирование»",
  partial: "«частично согласовано»",
  need_info: "«нужны сведения»",
  denied: "«отказ»",
  unknown: "«не определён»",
}

// reviewNote → понятный список полей через запятую. Неизвестные токены (готовые фразы) пропускаем как есть.
export function reviewFields(note?: string | null): string {
  if (!note) return ""
  return note
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => FIELD_HINTS[t] ?? t)
    .join(", ")
}

/**
 * Свободный текст заметки → язык менеджера: технические имена полей и англ. статусы
 * заменяются русскими, служебные префиксы («LLM») — понятными словами.
 * Заметка теперь составная (пайплайн + аудит + авто-сверка через « | ») — humanize покрывает всё.
 */
export function humanizeReviewNote(note: string): string {
  let t = note
  for (const [field, ru] of Object.entries(FIELD_HINTS)) {
    t = t.replace(new RegExp(`\\b${field}\\b`, "g"), ru)
  }
  for (const [status, ru] of Object.entries(STATUS_HINTS)) {
    t = t.replace(new RegExp(`\\b${status}\\b`, "g"), ru)
  }
  return t
    .replace(/✔?\s*LLM-сверка ok/g, "✔ авто-сверка пройдена")
    .replace(/\(LLM-сверка ([\d.-]+)\)/g, "(авто-сверка $1)")
    .replace(/LLM-провер[а-яё]*/gi, "авто-проверка")
    .replace(/LLM:\s*/g, "Авто-проверка: ")
    .replace(/\bLLM\b/g, "авто-проверка")
    .replace(/\s*\|\s*/g, " · ")
    .replace(/\s+/g, " ")
    .trim()
}

// Короткий текст пометки для карточки/тултипа. Чистый список тех-полей → «Проверьте поля: …»;
// составную заметку (аудит/авто-сверка) переводим целиком на язык менеджера.
export function reviewMessage(note?: string | null): string {
  if (!note?.trim()) return "Требует проверки."
  const tokens = note.split(",").map((t) => t.trim()).filter(Boolean)
  if (tokens.every((t) => FIELD_HINTS[t])) return `Проверьте поля: ${reviewFields(note)}.`
  return humanizeReviewNote(note)
}
