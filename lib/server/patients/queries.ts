import "server-only"
import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { guaranteeLetter, insuranceCompany } from "@/lib/db/schema"

import { computePatientState, patientKey, type PatientLetter } from "./state"

// ─────────────────────────────────────────────────────────────────────
// Пациенты как отдельная сущность (требование владельца: письма дублируют пациента, и по
// реестру не видно, какие правила актуальны). Пациент НЕ хранится отдельной таблицей —
// он вычисляется из писем по ключу ФИО + точная дата рождения, поэтому всегда актуален
// и не создаёт второй копии персональных данных.
// ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

// Ключ пациента заполняется триггером в БД и проиндексирован — группируем и ищем по нему.
const pKey = guaranteeLetter.patientKey

type ListArgs = { orgId: string | null; q?: string; page?: number }

export async function patientsList({ orgId, q, page = 1 }: ListArgs) {
  const scope = and(
    orgId ? eq(guaranteeLetter.organizationId, orgId) : undefined,
    isNotNull(guaranteeLetter.patientKey),
    eq(guaranteeLetter.isDuplicate, false),
    q
      ? or(
          ilike(guaranteeLetter.patientFullName, `%${q}%`),
          sql`to_char(${guaranteeLetter.patientBirthDate}, 'YYYY') = ${q}`,
          ilike(guaranteeLetter.policyNumber, `%${q}%`),
        )
      : undefined,
  )

  const rows = await db()
    .select({
      fullName: sql<string>`max(${guaranteeLetter.patientFullName})`,
      birthDate: guaranteeLetter.patientBirthDate,
      key: pKey,
      letters: sql<number>`count(*)`,
      lastDate: sql<string | null>`max(${guaranteeLetter.letterDate})::text`,
      insurers: sql<string>`string_agg(distinct coalesce(${insuranceCompany.name}, ''), ', ')`,
      activeGuarantees: sql<number>`count(*) filter (where ${guaranteeLetter.docType} = 'guarantee'
        and coalesce(${guaranteeLetter.validUntil}, ${guaranteeLetter.coverageTo}) >= current_date)`,
      attached: sql<boolean>`(array_agg(${guaranteeLetter.approvalStatus} order by ${guaranteeLetter.letterDate} nulls first)
        filter (where ${guaranteeLetter.approvalStatus} in ('enroll','detach')))[
        array_length(array_agg(${guaranteeLetter.approvalStatus}) filter (where ${guaranteeLetter.approvalStatus} in ('enroll','detach')), 1)] = 'enroll'`,
    })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .where(scope)
    .groupBy(pKey, guaranteeLetter.patientBirthDate)
    .orderBy(desc(sql`max(${guaranteeLetter.letterDate})`))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const totals = await db()
    .select({ total: sql<number>`count(*)` })
    .from(
      db()
        .select({ k: pKey, d: guaranteeLetter.patientBirthDate })
        .from(guaranteeLetter)
        .where(scope)
        .groupBy(pKey, guaranteeLetter.patientBirthDate)
        .as("p"),
    )

  return {
    rows: rows.map((r) => ({ ...r, key: r.key ?? patientKey(r.fullName, String(r.birthDate)) })),
    total: Number(totals[0]?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  }
}

/** Все письма пациента по хэш-ключу (ПДн в URL не попадают). */
export async function patientCard(key: string, orgId: string | null) {
  const rows = await db()
    .select({
      id: guaranteeLetter.id,
      fullName: guaranteeLetter.patientFullName,
      birthDate: guaranteeLetter.patientBirthDate,
      letterDate: guaranteeLetter.letterDate,
      approvalStatus: guaranteeLetter.approvalStatus,
      docType: guaranteeLetter.docType,
      insuranceCompanyId: guaranteeLetter.insuranceCompanyId,
      insurer: insuranceCompany.name,
      services: guaranteeLetter.services,
      validUntil: sql<string | null>`coalesce(${guaranteeLetter.validUntil}, ${guaranteeLetter.coverageTo})::text`,
      amountLimit: guaranteeLetter.amountLimit,
      conditions: guaranteeLetter.conditions,
      isDuplicate: guaranteeLetter.isDuplicate,
      policyNumber: guaranteeLetter.policyNumber,
      letterNumber: guaranteeLetter.letterNumber,
    })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .where(
      and(
        orgId ? eq(guaranteeLetter.organizationId, orgId) : undefined,
        eq(guaranteeLetter.patientKey, key),
      ),
    )
    .orderBy(desc(guaranteeLetter.letterDate))

  const mine = rows
  if (mine.length === 0) return null

  const letters: PatientLetter[] = mine.map((r) => ({
    id: r.id,
    letterDate: r.letterDate ? String(r.letterDate) : null,
    approvalStatus: r.approvalStatus,
    docType: r.docType,
    insuranceCompanyId: r.insuranceCompanyId,
    insurer: r.insurer,
    services: Array.isArray(r.services) ? r.services.filter((s): s is string => typeof s === "string") : [],
    validUntil: r.validUntil,
    amountLimit: r.amountLimit,
    conditions: r.conditions,
    isDuplicate: r.isDuplicate,
  }))

  return {
    fullName: mine[0].fullName ?? "",
    birthDate: String(mine[0].birthDate),
    policyNumber: mine.find((r) => r.policyNumber)?.policyNumber ?? null,
    state: computePatientState(letters),
    letters,
    raw: mine,
  }
}
