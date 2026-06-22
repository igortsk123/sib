// Классификация направления обслуживания (амбулатория | стоматология) по услугам/тексту письма.
// Детерминированно по ключевым словам; не определилось → ambulatory (основной поток клиники, ручная правка).
// План care-type-split. Зеркальная логика в .mail-intake/extract_dataset.py для боевого пайплайна.

const DENTAL = [
  "стоматолог", "стоматологи", "зуб", "зубн", "кариес", "пломб", "эндодонт", "ортодонт", "ортопант",
  "пульпит", "периодонтит", "депульп", "коронк", "протез зуб", "имплант зуб", "удаление зуба", "брекет",
  "гигиена полости рта", "rvg", "ртг зуб",
]
const AMBULATORY = [
  "поликлин", "амбулатор", "консультац", "приём врача", "прием врача", "терапевт", "офтальм", "невролог",
  "кардиолог", "узи", "мрт", "кт ", "анализ", "лор", "гастроэнтер", "эндокринолог", "дерматолог",
]

export type CareType = "ambulatory" | "dentistry" | "combined" | "other"

export function classifyCareType(services: unknown[] | null | undefined, text?: string | null): CareType {
  const hay = [
    ...(Array.isArray(services) ? services.map((s) => String(s)) : []),
    text ?? "",
  ]
    .join(" ")
    .toLowerCase()
  if (!hay.trim()) return "other"
  const dental = DENTAL.some((k) => hay.includes(k))
  const amb = AMBULATORY.some((k) => hay.includes(k))
  if (dental && amb) return "combined" // и амбулатория, и стоматология в одном документе
  if (dental) return "dentistry"
  if (amb) return "ambulatory"
  return "ambulatory" // по умолчанию — амбулатория (ручная правка при необходимости)
}

export const CARE_TYPE_LABELS: Record<string, string> = {
  ambulatory: "Амбулатория",
  dentistry: "Стоматология",
  combined: "Комплексное",
  other: "—",
}
