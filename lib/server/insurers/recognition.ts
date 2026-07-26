import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { coverageRule, insuranceCompany, programAlias, programDocument } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Карта распознавания в контексте страховой (аудит масштабируемости, D33):
// как разбираются её письма (детерминированный парсер / встроенный разбор / LLM),
// где реестр её правил, какие типы программ у неё заведены. Источник карты —
// insurance_company.rules (jsonb, редактируемый реестр) — фронт и бэк едины.
// ─────────────────────────────────────────────────────────────────────

export type ParsingEntry = { doc: string; how: string }

export type RecognitionMap = {
  parsing: ParsingEntry[]
  registryUrl: string | null
  registryNote: string | null
  programs: { name: string; rules: number }[]
  aliases: { alias: string; program: string | null; kind: string; note: string | null }[]
}

export async function recognitionMap(insurerId: string): Promise<RecognitionMap> {
  const [ic] = await db()
    .select({ rules: insuranceCompany.rules })
    .from(insuranceCompany)
    .where(eq(insuranceCompany.id, insurerId))

  const raw = (ic?.rules ?? {}) as Record<string, unknown>
  const parsing = Array.isArray(raw.parsing)
    ? (raw.parsing as ParsingEntry[]).filter((p) => p && typeof p.doc === "string" && typeof p.how === "string")
    : []

  // Типы программ: по правилам покрытия из АКТУАЛЬНЫХ редакций документов этой СК.
  const programs = await db()
    .select({
      name: sql<string>`coalesce(${coverageRule.programName}, 'общие правила страховой')`,
      rules: sql<number>`count(*)`,
    })
    .from(coverageRule)
    .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
    .where(and(eq(coverageRule.insuranceCompanyId, insurerId), isNull(programDocument.supersededById)))
    .groupBy(coverageRule.programName)
    .orderBy(sql`count(*) desc`)

  const aliases = await db()
    .select({
      alias: programAlias.aliasNorm,
      program: programAlias.programName,
      kind: programAlias.kind,
      note: programAlias.note,
    })
    .from(programAlias)
    .where(eq(programAlias.insuranceCompanyId, insurerId))
    .orderBy(programAlias.kind, programAlias.aliasNorm)

  return {
    parsing,
    registryUrl: typeof raw.registryUrl === "string" ? raw.registryUrl : null,
    registryNote: typeof raw.registryNote === "string" ? raw.registryNote : null,
    programs: programs.map((p) => ({ name: p.name, rules: Number(p.rules) })),
    aliases,
  }
}
