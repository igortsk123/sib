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
