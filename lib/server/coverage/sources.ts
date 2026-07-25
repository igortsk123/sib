import "server-only"
import { sql } from "drizzle-orm"

import { db } from "@/lib/db"

// ─────────────────────────────────────────────────────────────────────
// Сводка источников и покрытия (требование владельца): по каждой программе из писем видно,
// сколько пациентов ею охвачено, есть ли документ-источник и сколько из него правил.
// Покрытие считается ОНЛАЙН по живым данным: пациент считается покрытым, если хотя бы одна
// его программа имеет правила. Где источника нет — так и показываем, без подмены примерами.
// ─────────────────────────────────────────────────────────────────────

/** Нормализация строки программы из письма — должна совпадать с normalizeAlias() в коде. */
const ALIAS_SQL = sql`btrim(regexp_replace(replace(lower(translate(svc, '«»"''\`', '     ')), 'ё', 'е'), '\\s+', ' ', 'g'), ' .,;:')`

export type SourceRow = {
  insurer: string
  insurerId: string
  alias: string
  programName: string | null
  patients: number
  share: number
  rules: number
  documents: { id: string; title: string; url: string | null }[]
}

export async function coverageSources(orgId: string | null) {
  const orgFilter = orgId ? sql`and gl.organization_id = ${orgId}` : sql``

  const rows = await db().execute<{
    insurer: string
    insurer_id: string
    alias: string
    program_name: string | null
    patients: number
    rules: number
    docs: { id: string; title: string; url: string | null }[] | null
  }>(sql`
    with per_letter as (
      select gl.insurance_company_id as ck, gl.patient_key, ${ALIAS_SQL} as alias
      from guarantee_letter gl, jsonb_array_elements_text(gl.services) as svc
      where gl.patient_key is not null and gl.is_duplicate = false ${orgFilter}
    ),
    agg as (
      select ck, alias, count(distinct patient_key) as patients
      from per_letter where length(alias) >= 3 group by ck, alias
    )
    select ic.name as insurer, ic.id::text as insurer_id, a.alias, pa.program_name,
      a.patients::int as patients,
      (select count(*) from coverage_rule cr
        join program_document pd on pd.id = cr.document_id and pd.superseded_by_id is null
        where cr.insurance_company_id = a.ck and cr.program_name is not distinct from pa.program_name
          and pa.program_name is not null)::int as rules,
      (select json_agg(distinct jsonb_build_object('id', pd.id::text, 'title', pd.title,
                                                   'url', coalesce(pd.file_url, pd.source_url)))
        from coverage_rule cr
        join program_document pd on pd.id = cr.document_id and pd.superseded_by_id is null
        where cr.insurance_company_id = a.ck and cr.program_name is not distinct from pa.program_name
          and pa.program_name is not null) as docs
    from agg a
    join insurance_company ic on ic.id = a.ck
    left join program_alias pa on pa.insurance_company_id = a.ck and pa.alias_norm = a.alias
    order by a.patients desc
    limit 120
  `)

  const totals = await db().execute<{ total: number; covered: number }>(sql`
    with per_letter as (
      select gl.insurance_company_id as ck, gl.patient_key, ${ALIAS_SQL} as alias
      from guarantee_letter gl, jsonb_array_elements_text(gl.services) as svc
      where gl.patient_key is not null and gl.is_duplicate = false ${orgFilter}
    ),
    pat as (
      select patient_key, bool_or(exists (
        select 1 from program_alias pa
        join coverage_rule cr on cr.insurance_company_id = pa.insurance_company_id
                             and cr.program_name = pa.program_name
        join program_document pd on pd.id = cr.document_id and pd.superseded_by_id is null
        where pa.insurance_company_id = pl.ck and pa.alias_norm = pl.alias
      )) as covered
      from per_letter pl group by patient_key
    )
    select count(*)::int as total, count(*) filter (where covered)::int as covered from pat
  `)

  const total = Number(totals[0]?.total ?? 0)
  const covered = Number(totals[0]?.covered ?? 0)
  const patientsTotal = total || 1

  const list: SourceRow[] = rows.map((r) => ({
    insurer: r.insurer,
    insurerId: r.insurer_id,
    alias: r.alias,
    programName: r.program_name,
    patients: Number(r.patients),
    share: Math.round((Number(r.patients) / patientsTotal) * 1000) / 10,
    rules: Number(r.rules ?? 0),
    documents: r.docs ?? [],
  }))

  return { rows: list, total, covered, coveredShare: Math.round((covered / patientsTotal) * 1000) / 10 }
}
