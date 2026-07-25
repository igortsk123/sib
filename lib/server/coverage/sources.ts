import "server-only"
import { sql } from "drizzle-orm"

import { db } from "@/lib/db"

// ─────────────────────────────────────────────────────────────────────
// Сводка источников и покрытия (требование владельца): по каждой ПРОГРАММЕ видно, сколько
// пациентов ею охвачено, какие документы есть и сколько из них правил. Где источника нет —
// показываем явно, без подмены примерами.
//
// Два принципа расчёта:
//  1. Считаем ТОЛЬКО письма прикрепления/открепления — программа известна из них. В гарантийных
//     письмах в том же поле лежат конкретные услуги («Эндодонтическое лечение 25 зуба»),
//     они не программы и в покрытие не входят.
//  2. Составные строки разбиваются на ОТДЕЛЬНЫЕ программы: «"Поликлиника" + "Поликлиническая
//     помощь на территории России"» — это две программы, каждая со своими правилами.
// ─────────────────────────────────────────────────────────────────────

/** Нормализация названия программы — совпадает с normalizeAlias()/splitPrograms() в коде. */
const NORM = (expr: ReturnType<typeof sql>) =>
  sql`btrim(regexp_replace(replace(lower(translate(${expr}, '«»"''\`', '     ')), 'ё', 'е'), '\\s+', ' ', 'g'), ' .,;:')`

/** Строка письма → отдельные программы: режем по кавычкам-группам, «+» и «;». */
const PROGRAM_ROWS = (orgFilter: ReturnType<typeof sql>) => sql`
  select gl.insurance_company_id as ck, gl.patient_key,
         ${NORM(sql`part`)} as program
  from guarantee_letter gl,
       jsonb_array_elements_text(gl.services) as svc,
       unnest(regexp_split_to_array(svc, '\\s*[;+]\\s*|"\\s*"|»\\s*«')) as part
  where gl.patient_key is not null
    and gl.is_duplicate = false
    and gl.approval_status in ('enroll', 'detach')  -- гарантийные письма в покрытие не входят
    ${orgFilter}
`

export type SourceRow = {
  insurer: string
  insurerId: string
  program: string
  matchedProgram: string | null
  reason: string | null
  patients: number
  share: number
  rules: number
  documents: { id: string; title: string; url: string | null }[]
}

export async function coverageSources(orgId: string | null) {
  if (orgId === "__none__") return { rows: [], total: 0, covered: 0, coveredShare: 0 }
  const orgFilter = orgId ? sql`and gl.organization_id = ${orgId}` : sql``

  const rows = await db().execute<{
    insurer: string
    insurer_id: string
    program: string
    program_name: string | null
    reason: string | null
    patients: number
    rules: number
    docs: { id: string; title: string; url: string | null }[] | null
  }>(sql`
    with per_letter as (${PROGRAM_ROWS(orgFilter)}),
    agg as (
      select ck, program, count(distinct patient_key) as patients
      from per_letter where length(program) >= 3 group by ck, program
    )
    select ic.name as insurer, ic.id::text as insurer_id, a.program, pa.program_name, pa.note as reason,
      a.patients::int as patients,
      coalesce((select count(*) from coverage_rule cr
        join program_document pd on pd.id = cr.document_id and pd.superseded_by_id is null
        where cr.insurance_company_id = a.ck and cr.program_name = pa.program_name), 0)::int as rules,
      (select json_agg(distinct jsonb_build_object('id', pd.id::text, 'title', pd.title,
                                                   'url', coalesce(pd.file_url, pd.source_url)))
        from coverage_rule cr
        join program_document pd on pd.id = cr.document_id and pd.superseded_by_id is null
        where cr.insurance_company_id = a.ck and cr.program_name = pa.program_name) as docs
    from agg a
    join insurance_company ic on ic.id = a.ck
    left join program_alias pa on pa.insurance_company_id = a.ck and pa.alias_norm = a.program
    order by a.patients desc
    limit 150
  `)

  const totals = await db().execute<{ total: number; covered: number }>(sql`
    with per_letter as (${PROGRAM_ROWS(orgFilter)}),
    pat as (
      select patient_key, bool_or(exists (
        select 1 from program_alias pa
        join coverage_rule cr on cr.insurance_company_id = pa.insurance_company_id
                             and cr.program_name = pa.program_name
        join program_document pd on pd.id = cr.document_id and pd.superseded_by_id is null
        where pa.insurance_company_id = pl.ck and pa.alias_norm = pl.program
      )) as covered
      from per_letter pl where length(pl.program) >= 3 group by patient_key
    )
    select count(*)::int as total, count(*) filter (where covered)::int as covered from pat
  `)

  const total = Number(totals[0]?.total ?? 0)
  const covered = Number(totals[0]?.covered ?? 0)
  const denominator = total || 1

  const list: SourceRow[] = rows.map((r) => ({
    insurer: r.insurer,
    insurerId: r.insurer_id,
    program: r.program,
    matchedProgram: r.program_name,
    reason: r.reason,
    patients: Number(r.patients),
    share: Math.round((Number(r.patients) / denominator) * 1000) / 10,
    rules: Number(r.rules ?? 0),
    documents: r.docs ?? [],
  }))

  return { rows: list, total, covered, coveredShare: Math.round((covered / denominator) * 1000) / 10 }
}
