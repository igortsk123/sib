import { createHash } from "node:crypto"

import { matchesGuarantee } from "./service-match"

// ─────────────────────────────────────────────────────────────────────
// Текущее состояние пациента по его письмам (план patients-section).
// Проблема, которую решаем: по одному пациенту приходит несколько писем — прикрепление,
// открепление, гарантийные письма — и по реестру НЕ ВИДНО, какие правила действуют сейчас.
// Здесь чистая логика: массив писем → текущая программа, действующие ГП. Покрыта unit-тестами.
// ─────────────────────────────────────────────────────────────────────

export type PatientLetter = {
  id: string
  letterDate: string | null
  approvalStatus: string
  docType: string | null
  insuranceCompanyId: string | null
  insurer: string | null
  services: string[]
  validUntil: string | null
  amountLimit: string | null
  conditions: string | null
  isDuplicate: boolean
}

export type PatientState = {
  /** Прикреплён ли пациент к программе сейчас. */
  attached: boolean
  /** Актуальные программы (из последнего прикрепления). */
  programs: string[]
  insuranceCompanyId: string | null
  insurer: string | null
  /** Дата последнего события прикрепления/открепления. */
  since: string | null
  /** Гарантийные письма, срок которых ещё не истёк. */
  activeGuarantees: PatientLetter[]
  /** Гарантийные письма с истёкшим сроком. */
  expiredGuarantees: PatientLetter[]
}

/** Ключ пациента для ссылок: ПДн в URL не попадают, только хэш от ФИО+даты рождения. */
export function patientKey(fullName: string, birthDate: string): string {
  const norm = `${fullName.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim()}|${birthDate}`
  return createHash("sha256").update(norm).digest("hex").slice(0, 24)
}

const GUARANTEE_STATUSES = new Set(["approved", "partial"])

export function computePatientState(letters: PatientLetter[], today: Date = new Date()): PatientState {
  const real = letters.filter((l) => !l.isDuplicate)
  const byDate = [...real].sort((a, b) => (a.letterDate ?? "").localeCompare(b.letterDate ?? ""))

  // Прикрепление: последнее письмо enroll/detach решает, числится ли пациент сейчас.
  const enrollments = byDate.filter((l) => l.approvalStatus === "enroll" || l.approvalStatus === "detach")
  const last = enrollments[enrollments.length - 1] ?? null
  const attached = last?.approvalStatus === "enroll"
  const lastEnroll = [...enrollments].reverse().find((l) => l.approvalStatus === "enroll") ?? null

  // Программы берём из последнего ПРИКРЕПЛЕНИЯ (в откреплении указана та же программа,
  // но факт открепления важнее её содержания).
  const source = attached ? lastEnroll : null
  const iso = today.toISOString().slice(0, 10)

  const guarantees = byDate.filter(
    (l) => l.docType === "guarantee" || GUARANTEE_STATUSES.has(l.approvalStatus),
  )
  const activeGuarantees = guarantees.filter((l) => !l.validUntil || l.validUntil >= iso)
  const expiredGuarantees = guarantees.filter((l) => l.validUntil && l.validUntil < iso)

  return {
    attached,
    programs: source?.services ?? [],
    insuranceCompanyId: source?.insuranceCompanyId ?? last?.insuranceCompanyId ?? byDate.at(-1)?.insuranceCompanyId ?? null,
    insurer: source?.insurer ?? last?.insurer ?? byDate.at(-1)?.insurer ?? null,
    since: last?.letterDate ?? null,
    activeGuarantees,
    expiredGuarantees,
  }
}

/**
 * Действующее гарантийное письмо, покрывающее запрошенную услугу, — или null, если
 * согласованного письма нет и его нужно запрашивать. Сравнение — по типу вмешательства
 * и номеру зуба (см. service-match), а не по совпадению отдельных слов.
 */
export function guaranteeCovering(
  state: PatientState,
  serviceQuery: string,
): { letter: PatientLetter; reason: string } | null {
  for (const g of state.activeGuarantees) {
    const text = [...g.services, g.conditions ?? ""].join(" ")
    const m = matchesGuarantee(text, serviceQuery)
    if (m.covered) return { letter: g, reason: m.reason }
  }
  return null
}
