import "server-only"
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { coverageRule, insuranceCompany, programDocument } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Справочник правил покрытия (требование владельца: «все правила нужно сделать доступными»).
// Только актуальные редакции (не superseded), с поиском по услуге и фильтрами СК/программа.
// ─────────────────────────────────────────────────────────────────────

export type CatalogFilters = { insurer?: string; program?: string; q?: string; page?: number }

const PAGE_SIZE = 100

export async function coverageCatalog(f: CatalogFilters) {
  const page = Math.max(1, f.page ?? 1)
  const where = and(
    isNull(programDocument.supersededById),
    f.insurer ? eq(coverageRule.insuranceCompanyId, f.insurer) : undefined,
    f.program ? eq(coverageRule.programName, f.program) : undefined,
    f.q
      ? or(
          ilike(coverageRule.servicePattern, `%${f.q}%`),
          ilike(coverageRule.serviceClass, `%${f.q}%`),
          ilike(coverageRule.conditionText, `%${f.q}%`),
        )
      : undefined,
  )

  const rows = await db()
    .select({
      insurer: insuranceCompany.name,
      programName: coverageRule.programName,
      serviceClass: coverageRule.serviceClass,
      servicePattern: coverageRule.servicePattern,
      verdict: coverageRule.verdict,
      conditionText: coverageRule.conditionText,
      limitAmount: coverageRule.limitAmount,
      clause: coverageRule.clause,
      scopeLevel: coverageRule.scopeLevel,
      needsReview: coverageRule.needsReview,
      documentTitle: programDocument.title,
      documentUrl: sql<string | null>`coalesce(${programDocument.fileUrl}, ${programDocument.sourceUrl})`,
      effectiveFrom: programDocument.effectiveFrom,
    })
    .from(coverageRule)
    .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, coverageRule.insuranceCompanyId))
    .where(where)
    .orderBy(asc(insuranceCompany.name), desc(coverageRule.scopeLevel), asc(coverageRule.programName), asc(coverageRule.clause))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const [{ total }] = await db()
    .select({ total: count() })
    .from(coverageRule)
    .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
    .where(where)

  return { rows, total, page, pageSize: PAGE_SIZE }
}

export async function coverageFacets() {
  const insurers = await db()
    .select({ id: insuranceCompany.id, name: insuranceCompany.name, rules: count(coverageRule.id) })
    .from(coverageRule)
    .innerJoin(insuranceCompany, eq(insuranceCompany.id, coverageRule.insuranceCompanyId))
    .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
    .where(isNull(programDocument.supersededById))
    .groupBy(insuranceCompany.id, insuranceCompany.name)
    .orderBy(desc(count(coverageRule.id)))
  return { insurers }
}
