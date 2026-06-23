// Классификация направления обслуживания (амбулатория | стоматология) по услугам/тексту письма.
// Детерминированно по ключевым словам; не определилось → ambulatory (основной поток клиники, ручная правка).
// План care-type-split. Зеркальная логика в .mail-intake/extract_dataset.py для боевого пайплайна.

const DENTAL = [
  "стоматолог", "зуб", "зубн", "кариес", "пломб", "эндодонт", "ортодонт", "ортопант",
  "пульпит", "периодонтит", "депульп", "коронк", "протез зуб", "имплант зуб", "удаление зуба", "брекет",
  "гигиена полости рта", "air flow", "ртг зуб",
]
const AMBULATORY = [
  "консультац", "приём врача", "прием врача", "терапевт", "офтальм", "невролог", "кардиолог",
  "узи", "мрт", "анализ", "гастроэнтер", "эндокринолог", "дерматолог", "хирург", "гинеколог",
]
const AMB_SOFT = ["поликлин", "амбулатор"]

export type CareType = "ambulatory" | "dentistry" | "combined" | "other"

// Детерминированный ФОЛБЭК (строки Excel-реестров без LLM). Для писем направление ставит LLM (enrich).
// ПО УСЛУГЕ В ПЕРВУЮ ОЧЕРЕДЬ: услуга названа — судим по ней (стоматологическая → dentistry, даже если
// программа «амбулаторная»). combined — только если услуга реально охватывает оба. Нет услуги — по тексту.
export function classifyCareType(services: unknown[] | null | undefined, text?: string | null): CareType {
  const svc = (Array.isArray(services) ? services.map((s) => String(s)).join(" ") : "").toLowerCase()
  const full = (svc + " " + (text ?? "")).toLowerCase()
  if (!full.trim()) return "other"
  if (svc.trim()) {
    const d = DENTAL.some((k) => svc.includes(k))
    const a = AMBULATORY.some((k) => svc.includes(k)) || AMB_SOFT.some((k) => svc.includes(k))
    if (d && a) return "combined"
    if (d) return "dentistry"
    if (a) return "ambulatory"
  }
  const dt = DENTAL.some((k) => full.includes(k))
  const at = AMBULATORY.some((k) => full.includes(k))
  const atSoft = AMB_SOFT.some((k) => full.includes(k))
  if (dt && (at || atSoft)) return "combined"
  if (dt) return "dentistry"
  return "ambulatory"
}

export const CARE_TYPE_LABELS: Record<string, string> = {
  ambulatory: "Амбулатория",
  dentistry: "Стоматология",
  combined: "Комплексное",
  other: "—",
}
