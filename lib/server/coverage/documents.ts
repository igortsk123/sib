import "server-only"
import { and, count, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { coverageRule, documentCheck, insuranceCompany, programDocument } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Документы условий и история их проверок (требование владельца: видно, что проверяли,
// что файл тот же, а что обновилось). Источник — журнал document_check, который пишет
// недельный поллер.
// ─────────────────────────────────────────────────────────────────────

export async function documentsWithChecks() {
  const docs = await db()
    .select({
      id: programDocument.id,
      title: programDocument.title,
      insurer: insuranceCompany.name,
      docKind: programDocument.docKind,
      sourceUrl: programDocument.sourceUrl,
      fileUrl: programDocument.fileUrl,
      storagePath: programDocument.storagePath,
      effectiveFrom: programDocument.effectiveFrom,
      lastCheckedAt: programDocument.lastCheckedAt,
      rules: sql<number>`(select count(*) from ${coverageRule} where ${coverageRule.documentId} = ${programDocument.id})`,
      needsReview: sql<number>`(select count(*) from ${coverageRule} where ${coverageRule.documentId} = ${programDocument.id} and ${coverageRule.needsReview})`,
      pages: sql<number>`(select count(*) from document_text dt where dt.document_id = ${programDocument.id})`,
      versions: sql<number>`(select count(*) from ${programDocument} p2 where p2.superseded_by_id = ${programDocument.id}) + 1`,
    })
    .from(programDocument)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, programDocument.insuranceCompanyId))
    .where(isNull(programDocument.supersededById))
    .orderBy(insuranceCompany.name, programDocument.title)

  const checks = await db()
    .select({
      documentId: documentCheck.documentId,
      checkedAt: documentCheck.checkedAt,
      status: documentCheck.status,
      message: documentCheck.message,
      sizeBytes: documentCheck.sizeBytes,
    })
    .from(documentCheck)
    .orderBy(desc(documentCheck.checkedAt))
    .limit(200)

  const byDoc = new Map<string, typeof checks>()
  for (const c of checks) {
    const list = byDoc.get(c.documentId) ?? []
    if (list.length < 5) list.push(c)
    byDoc.set(c.documentId, list)
  }
  return docs.map((d) => ({ ...d, checks: byDoc.get(d.id) ?? [] }))
}

export async function checkSummary() {
  const rows = await db()
    .select({ status: documentCheck.status, n: count() })
    .from(documentCheck)
    .groupBy(documentCheck.status)
  const last = await db()
    .select({ checkedAt: documentCheck.checkedAt })
    .from(documentCheck)
    .orderBy(desc(documentCheck.checkedAt))
    .limit(1)
  const pending = await db()
    .select({ n: count() })
    .from(coverageRule)
    .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
    .where(and(isNull(programDocument.supersededById), eq(coverageRule.needsReview, true)))
  return {
    byStatus: Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>,
    lastCheckedAt: last[0]?.checkedAt ?? null,
    pendingReview: pending[0]?.n ?? 0,
  }
}
