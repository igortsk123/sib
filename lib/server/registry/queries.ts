import "server-only"
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { attachment, emailMessage, guaranteeLetter, insuranceCompany } from "@/lib/db/schema"

export type RegistryFilter = {
  q?: string // поиск: пациент / полис / № ГП
  insurerId?: string // фильтр: страховая
  status?: string // фильтр: статус
  source?: string // фильтр: источник
  dateFrom?: string // фильтр: дата письма от
  dateTo?: string // фильтр: дата письма до
  orgId?: string | null
}

function whereClause(f: RegistryFilter) {
  const conds = []
  // Скоуп по клинике: реальный id → фильтр; "__none__" → ничего; null → все клиники (админ).
  if (f.orgId === "__none__") conds.push(sql`false`)
  else if (f.orgId) conds.push(eq(guaranteeLetter.organizationId, f.orgId))
  // ПОИСК (текст): пациент / полис / № ГП.
  if (f.q && f.q.trim()) {
    const like = `%${f.q.trim()}%`
    conds.push(
      or(
        ilike(guaranteeLetter.patientFullName, like),
        ilike(guaranteeLetter.policyNumber, like),
        ilike(guaranteeLetter.letterNumber, like),
      ),
    )
  }
  // ФИЛЬТРЫ (точное совпадение): страховая / статус / источник / дата.
  if (f.insurerId) conds.push(eq(guaranteeLetter.insuranceCompanyId, f.insurerId))
  if (f.status) conds.push(eq(guaranteeLetter.approvalStatus, f.status as never))
  if (f.source) conds.push(eq(guaranteeLetter.source, f.source))
  if (f.dateFrom) conds.push(sql`${guaranteeLetter.letterDate} >= ${f.dateFrom}`)
  if (f.dateTo) conds.push(sql`${guaranteeLetter.letterDate} <= ${f.dateTo}`)
  return conds.length ? and(...conds) : undefined
}

// Реестр ГП с поиском по пациенту/полису/№ГП/страховой.
export async function searchLetters(f: RegistryFilter, limit = 500) {
  return db()
    .select({
      id: guaranteeLetter.id,
      patient: guaranteeLetter.patientFullName,
      policy: guaranteeLetter.policyNumber,
      letterNumber: guaranteeLetter.letterNumber,
      status: guaranteeLetter.approvalStatus,
      letterDate: guaranteeLetter.letterDate,
      source: guaranteeLetter.source,
      method: guaranteeLetter.method,
      needsReview: guaranteeLetter.needsReview,
      reviewNote: guaranteeLetter.reviewNote,
      insurer: insuranceCompany.name,
      receivedAt: emailMessage.receivedAt,
    })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .leftJoin(emailMessage, eq(emailMessage.id, guaranteeLetter.emailMessageId))
    .where(whereClause(f))
    .orderBy(desc(emailMessage.receivedAt))
    .limit(limit)
}

// Страховые для фильтра (только те, у кого есть записи в скоупе — но для простоты все активные).
export async function listInsurerOptions() {
  return db()
    .select({ id: insuranceCompany.id, name: insuranceCompany.name })
    .from(insuranceCompany)
    .orderBy(insuranceCompany.name)
}

export async function countLetters(orgId?: string | null) {
  const where =
    orgId === "__none__"
      ? sql`false`
      : orgId
        ? eq(guaranteeLetter.organizationId, orgId)
        : undefined
  const r = await db().select({ n: sql<number>`count(*)::int` }).from(guaranteeLetter).where(where)
  return r[0]?.n ?? 0
}

export async function getLetter(id: string) {
  const rows = await db()
    .select({ letter: guaranteeLetter, insurer: insuranceCompany.name })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .where(eq(guaranteeLetter.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null

  // Источники: все письма записи (письмо ГП + связанные письма-пароли).
  const srcIds = row.letter.sourceEmailIds?.length
    ? row.letter.sourceEmailIds
    : [row.letter.emailMessageId]
  const emails = await db()
    .select({
      id: emailMessage.id,
      mailbox: emailMessage.mailbox,
      receivedAt: emailMessage.receivedAt,
      docType: emailMessage.docType,
    })
    .from(emailMessage)
    .where(inArray(emailMessage.id, srcIds))
  // главное письмо — первым, письма-пароли — после.
  const sourceEmails = emails.sort((a, b) =>
    a.id === row.letter.emailMessageId ? -1 : b.id === row.letter.emailMessageId ? 1 : 0,
  )
  const atts = await db().select().from(attachment).where(inArray(attachment.emailMessageId, srcIds))
  return { ...row, sourceEmails, attachments: atts }
}
