// Подписи статусов согласования (бриф §7.3).
export const STATUS_LABELS: Record<string, string> = {
  approved: "Согласовано",
  denied: "Отказ",
  detach: "Открепить",
  enroll: "Прикрепить",
  partial: "Частично",
  need_info: "Требуется инфо",
  need_approval: "Треб. согласование",
  unknown: "—",
}

export const SOURCE_LABELS: Record<string, string> = {
  body: "Тело письма",
  pdf: "PDF",
  xlsx: "Excel",
  xls: "Excel",
  rtf: "RTF",
  archive: "Архив",
}
