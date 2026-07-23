// Подписи статусов согласования (бриф §7.3).
export const STATUS_LABELS: Record<string, string> = {
  approved: "Согласовано",
  denied: "Отказ",
  detach: "Открепить",
  enroll: "Прикрепить",
  annul: "Аннулировать",
  partial: "Частично",
  need_info: "Требуется инфо",
  need_approval: "Треб. согласование",
  unknown: "—",
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  guarantee: "Гарантийное письмо",
  enroll: "Прикрепление",
  detach: "Открепление",
  annul: "Аннулирование ГП",
  referral: "Направление",
  denial: "Отказ",
  info_request: "Запрос информации",
  archive_password: "Пароль к архиву",
  service: "Служебное",
  other: "Прочее",
}

// «Тип» записи (что за документ). Берём сохранённый docType; если его нет — выводим из статуса
// (прикрепление/открепление/аннулирование, иначе гарантийное письмо). Определяет смысл даты «до».
export function docTypeLabel(docType: string | null | undefined, status?: string | null): string {
  if (docType && DOC_TYPE_LABELS[docType]) return DOC_TYPE_LABELS[docType]
  switch (status) {
    case "enroll":
      return "Прикрепление"
    case "detach":
      return "Открепление"
    case "annul":
      return "Аннулирование ГП"
    default:
      return "Гарантийное письмо"
  }
}

export const SOURCE_LABELS: Record<string, string> = {
  body: "Тело письма",
  pdf: "PDF",
  xlsx: "Excel",
  xls: "Excel",
  rtf: "RTF",
  archive: "Архив",
}

// Как разобрана запись — понятными словами (вместо «deterministic» и т.п.).
export const METHOD_LABELS: Record<string, string> = {
  deterministic: "Парсер",
  "deterministic+llm": "Парсер + ИИ",
  llm: "ИИ",
  llm_vision: "ИИ (скан/фото)",
}

// ─────────────────────────────────────────────────────────────────────
// Отображение значения поля с учётом статуса извлечения (guarantee_letter.field_status).
// Правило владельца: пустая ячейка не должна быть двусмысленной.
//  • значение есть → показываем значение (оно приоритетнее статуса);
//  • пусто + статус 'absent'    → «нет данных»    (проверили ФАЙЛ и ТЕЛО — поля реально нет);
//  • пусто + статус 'unreadable'→ «не распознано» (тех.сбой: нет библиотеки/архив закрыт/скан не прочитан);
//  • пусто без статуса          → "" (как раньше — обратная совместимость со старыми записями).
// ─────────────────────────────────────────────────────────────────────
export const CELL_ABSENT = "нет данных"
export const CELL_UNREADABLE = "не распознано"

export function cellText(value: string | null | undefined, status?: string | null): string {
  const v = value == null ? "" : String(value).trim()
  if (v) return v
  if (status === "absent") return CELL_ABSENT
  if (status === "unreadable") return CELL_UNREADABLE
  return ""
}
