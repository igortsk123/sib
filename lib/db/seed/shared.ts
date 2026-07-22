// Общие типы и нормализаторы для сида корпуса (corpus.ts) и живого приёма (ingest.ts).
// Один источник — не дублируем логику приведения полей между батч-сидом и инкрементальным upsert.

export type AttRec = { attId: string; filename: string | null; ext: string; size: number; sha256: string }
export type EmailRec = {
  emailId: string
  insurer: string
  mailbox: string
  receivedAt: string | null
  rawSha256: string
  isCompanion: boolean
  subject?: string | null
  bodyRaw?: string | null
  attachments: AttRec[]
}
export type LetterRec = {
  emailId: string
  sourceEmailIds: string[]
  attIds: string[]
  rowIndex: number | null
  patientFullName: string | null
  patientBirthDate?: string | null
  policyNumber: string | null
  letterNumber: string | null
  caseNumber?: string | null
  contractNumber?: string | null
  docType?: string | null
  careType?: string | null
  text?: string | null
  approvalStatus: string
  letterDate: string | null
  coverageFrom?: string | null
  coverageTo?: string | null
  validUntil?: string | null
  amountLimit?: string | null
  conditions?: string | null
  services: (string | null)[]
  source: string
  method?: string | null
  confidence?: Record<string, number>
  needsReview?: boolean
  reviewNote?: string | null
}
export type Dataset = { emails: EmailRec[]; letters: LetterRec[] }

export const VALID_STATUS = new Set([
  "approved", "denied", "detach", "enroll", "annul", "partial", "need_info", "need_approval", "unknown",
])
export const VALID_DOCTYPE = new Set([
  "guarantee", "enroll", "detach", "annul", "referral", "denial", "info_request", "archive_password", "service", "other",
])
export const VALID_CARETYPE = new Set(["ambulatory", "dentistry", "combined", "other"])

// Текст-поле в БД: не-строку (число/массив из письма/LLM) приводим к строке; пусто → null. Не роняем seed.
export function str(v: unknown): string | null {
  if (v == null || v === "") return null
  const s = String(v).trim()
  return s || null
}

// ФИО к виду «Фамилия Имя Отчество» (нормализуем только полностью ВЕРХНИЙ регистр).
// Устойчиво к не-строке (реальные письма/LLM иногда дают число/массив) — не роняем seed.
export function titleCaseFio(s: unknown): string | null {
  if (s == null || s === "") return null
  const t = String(s).trim()
  if (!t) return null
  if (t !== t.toUpperCase()) return t
  return t.toLowerCase().replace(/(^|[\s\-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

// Дата: принимаем только YYYY-MM-DD; DD.MM.YYYY конвертируем; Excel-серийные/прочее → null
// (защита от падения seed на «35234.0» из бинарного .xls).
export function safeDate(v: string | null | undefined): string | null {
  if (!v) return null
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = /^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}
