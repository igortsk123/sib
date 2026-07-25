import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { coverageRule, programAlias, programDocument } from "@/lib/db/schema"

import { looksLikeService, normalizeAlias, splitPrograms } from "./normalize"

// ─────────────────────────────────────────────────────────────────────
// Резолвер покрытия (план coverage-resolver): по письму (страховая + строки services + дата)
// собирает применимые правила. Ключевое: ПРОГРАММА СИЛЬНЕЕ ОБЩИХ ПРАВИЛ СК — у Ингосстраха
// общие правила запрещают почти всю стоматологию «кроме случаев, прямо предусмотренных
// Программой», поэтому программное правило вытесняет переопределяемое правило СК того же класса.
// ─────────────────────────────────────────────────────────────────────

export type ResolvedRule = {
  serviceClass: string
  servicePattern: string | null
  verdict: string
  conditionText: string | null
  limitAmount: string | null
  clause: string | null
  programName: string | null
  scopeLevel: string
  needsReview: boolean
  documentId: string
  documentTitle: string
  documentUrl: string | null
  effectiveFrom: string | null
}

export type CoverageResolution = {
  /** Программы, распознанные в строках письма (нормализованные). */
  matchedPrograms: string[]
  /** Строки письма, для которых не нашлось ни программы, ни услуги в правилах. */
  unmatched: string[]
  /** Программа, взятая фолбэком (у страховой ровно одна программа с правилами, а в письме
      программа не указана — РГС, Ренессанс пишут в прикреплениях пусто). */
  fallbackProgram: string | null
  rules: ResolvedRule[]
}

type Args = {
  insuranceCompanyId: string
  /** Значения guarantee_letter.services как есть. */
  services: unknown
  /** Дата полиса/письма — выбирается редакция, действующая на эту дату. */
  onDate?: Date | null
}

export async function resolveCoverage(args: Args): Promise<CoverageResolution> {
  const raw = (Array.isArray(args.services) ? args.services : [])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
  if (!args.insuranceCompanyId) return { matchedPrograms: [], unmatched: [], fallbackProgram: null, rules: [] }

  const aliases = await db()
    .select({ aliasNorm: programAlias.aliasNorm, programName: programAlias.programName, kind: programAlias.kind })
    .from(programAlias)
    .where(eq(programAlias.insuranceCompanyId, args.insuranceCompanyId))
  const byAlias = new Map(aliases.map((a) => [a.aliasNorm, a]))

  const programNames = new Set<string>()
  const serviceQueries = new Set<string>()
  const unmatched: string[] = []

  for (const value of raw) {
    const candidates = [normalizeAlias(value), ...splitPrograms(value)]
    let hit = false
    for (const candidate of candidates) {
      const alias = byAlias.get(candidate)
      if (!alias) continue
      hit = true
      if (alias.kind === "service") serviceQueries.add(candidate)
      else if (alias.programName) programNames.add(alias.programName)
    }
    if (!hit) {
      const norm = normalizeAlias(value)
      if (looksLikeService(norm)) serviceQueries.add(norm)
      else unmatched.push(norm)
    }
  }

  // Фолбэк: программа в письме не указана (или не распознана), но у страховой ровно ОДНА
  // программа с правилами — берём её как типовые условия, явно помечая это в ответе.
  let fallbackProgram: string | null = null
  if (programNames.size === 0) {
    const candidates = await db()
      .selectDistinct({ programName: coverageRule.programName })
      .from(coverageRule)
      .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
      .where(and(
        eq(coverageRule.insuranceCompanyId, args.insuranceCompanyId),
        isNull(programDocument.supersededById),
        isNotNull(coverageRule.programName),
      ))
    if (candidates.length === 1 && candidates[0].programName) {
      fallbackProgram = candidates[0].programName
      programNames.add(fallbackProgram)
    }
  }

  const rows = await selectRules(args.insuranceCompanyId, [...programNames], args.onDate ?? null)
  const rules = applyPrecedence(rows, [...serviceQueries])
  return { matchedPrograms: [...programNames], unmatched, fallbackProgram, rules }
}

type RuleRow = ResolvedRule & { overridable: boolean }

async function selectRules(
  insuranceCompanyId: string,
  programs: string[],
  onDate: Date | null,
): Promise<RuleRow[]> {
  const scope = programs.length
    ? or(inArray(coverageRule.programName, programs), isNull(coverageRule.programName))
    : isNull(coverageRule.programName)
  const editionOk = onDate
    ? or(isNull(programDocument.effectiveFrom), sql`${programDocument.effectiveFrom} <= ${onDate.toISOString().slice(0, 10)}`)
    : undefined

  return db()
    .select({
      serviceClass: coverageRule.serviceClass,
      servicePattern: coverageRule.servicePattern,
      verdict: coverageRule.verdict,
      conditionText: coverageRule.conditionText,
      limitAmount: coverageRule.limitAmount,
      clause: coverageRule.clause,
      programName: coverageRule.programName,
      scopeLevel: coverageRule.scopeLevel,
      overridable: coverageRule.overridable,
      needsReview: coverageRule.needsReview,
      documentId: coverageRule.documentId,
      documentTitle: programDocument.title,
      documentUrl: sql<string | null>`coalesce(${programDocument.fileUrl}, ${programDocument.sourceUrl})`,
      effectiveFrom: programDocument.effectiveFrom,
    })
    .from(coverageRule)
    .innerJoin(programDocument, eq(programDocument.id, coverageRule.documentId))
    .where(and(
      eq(coverageRule.insuranceCompanyId, insuranceCompanyId),
      isNull(programDocument.supersededById),
      scope,
      editionOk,
    ))
}

/**
 * Программа вытесняет переопределяемое правило СК того же класса услуг; правила программы идут
 * первыми. Если задан текст услуги — правила, совпавшие с ним, поднимаются наверх.
 */
export function applyPrecedence(rows: RuleRow[], serviceQueries: string[]): ResolvedRule[] {
  const programClasses = new Set(rows.filter((r) => r.scopeLevel === "program").map((r) => r.serviceClass))
  const kept = rows.filter((r) => !(r.scopeLevel === "insurer" && r.overridable && programClasses.has(r.serviceClass)))
  const relevance = (r: RuleRow) =>
    serviceQueries.some((q) => matchesService(r, q)) ? 0 : 1
  return kept
    .sort((a, b) =>
      relevance(a) - relevance(b) ||
      (a.scopeLevel === "program" ? 0 : 1) - (b.scopeLevel === "program" ? 0 : 1) ||
      verdictOrder(a.verdict) - verdictOrder(b.verdict))
    .map(({ overridable: _overridable, ...rule }) => rule)
}

function matchesService(rule: RuleRow, query: string): boolean {
  const pattern = rule.servicePattern?.toLowerCase()
  if (!pattern) return false
  return pattern.split(/\s+/).filter((w) => w.length >= 4).some((word) => query.includes(word))
}

function verdictOrder(verdict: string): number {
  return { covered: 0, conditional: 1, needs_approval: 2, excluded: 3 }[verdict] ?? 4
}
