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

// «Тип» записи (что это за документ) — выводится из статуса. Определяет смысл даты «до»:
// гарантийное → дата окончания письма; прикрепление → дата, когда откреплять.
export function docTypeLabel(status: string | null | undefined): string {
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
