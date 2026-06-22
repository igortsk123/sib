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
  approvalStatus: "статус (согласовано / отказ / прикрепить / открепить / аннулировать)",
  letterDate: "дата письма",
  coverageFrom: "дата начала обслуживания",
  coverageTo: "дата окончания обслуживания",
  validUntil: "срок действия письма",
  amountLimit: "ограничение по сумме",
  conditions: "условия / ограничения покрытия",
  services: "услуги / диагнозы",
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

// Полный текст пометки для карточки/тултипа.
export function reviewMessage(note?: string | null): string {
  const fields = reviewFields(note)
  const base = "Сверьте с оригиналом перед переносом в систему клиники"
  return fields ? `${base}. Проверьте поля: ${fields}.` : `${base}.`
}
