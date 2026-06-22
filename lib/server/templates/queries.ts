import "server-only"
import { and, asc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { docTemplate, insuranceCompany, parseLog } from "@/lib/db/schema"

export async function getInsurer(id: string) {
  const rows = await db().select().from(insuranceCompany).where(eq(insuranceCompany.id, id)).limit(1)
  return rows[0] ?? null
}

export async function listTemplates(insurerId: string) {
  return db()
    .select()
    .from(docTemplate)
    .where(eq(docTemplate.insuranceCompanyId, insurerId))
    .orderBy(asc(docTemplate.docType))
}

// Счётчик «на разбор» по типу: записи parse_log этой страховой с пробелом парсера (detGap непустой),
// сгруппированные по типу документа. Сигнал «источник сменил форму» / парсер недонастроен.
export async function driftCountByType(insurerName: string): Promise<Record<string, number>> {
  const rows = await db()
    .select({ docType: parseLog.docType, n: sql<number>`count(*)::int` })
    .from(parseLog)
    .where(
      and(eq(parseLog.insurer, insurerName), sql`jsonb_array_length(${parseLog.detGap}) > 0`),
    )
    .groupBy(parseLog.docType)
  const out: Record<string, number> = {}
  for (const r of rows) if (r.docType) out[r.docType] = r.n
  return out
}
