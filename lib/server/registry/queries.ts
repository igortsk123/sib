import "server-only"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { attachment, emailMessage, guaranteeLetter, insuranceCompany } from "@/lib/db/schema"

export type RegistryFilter = { q?: string; insurerId?: string; status?: string }

function whereClause(f: RegistryFilter) {
  const conds = []
  if (f.q && f.q.trim()) {
    const like = `%${f.q.trim()}%`
    conds.push(
      or(
        ilike(guaranteeLetter.patientFullName, like),
        ilike(guaranteeLetter.policyNumber, like),
        ilike(guaranteeLetter.letterNumber, like),
        ilike(insuranceCompany.name, like),
      ),
    )
  }
  if (f.insurerId) conds.push(eq(guaranteeLetter.insuranceCompanyId, f.insurerId))
  if (f.status) conds.push(eq(guaranteeLetter.approvalStatus, f.status as never))
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

export async function countLetters() {
  const r = await db().select({ n: sql<number>`count(*)::int` }).from(guaranteeLetter)
  return r[0]?.n ?? 0
}

export async function getLetter(id: string) {
  const rows = await db()
    .select({
      letter: guaranteeLetter,
      insurer: insuranceCompany.name,
      emailId: emailMessage.id,
      mailbox: emailMessage.mailbox,
      receivedAt: emailMessage.receivedAt,
      rawStoragePath: emailMessage.rawStoragePath,
    })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .leftJoin(emailMessage, eq(emailMessage.id, guaranteeLetter.emailMessageId))
    .where(eq(guaranteeLetter.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  const atts = row.emailId
    ? await db().select().from(attachment).where(eq(attachment.emailMessageId, row.emailId))
    : []
  return { ...row, attachments: atts }
}
