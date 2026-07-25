import Link from "next/link"
import { redirect } from "next/navigation"

import { coverageSources } from "@/lib/server/coverage/sources"
import { resolveRegistryScope } from "@/lib/server/scope"
import { coverageCatalog, coverageFacets } from "@/lib/server/coverage/catalog"
import { CoverageSources } from "@/components/admin/coverage-sources"
import { PageHeader } from "@/components/admin/page-header"
import { VerdictBadge } from "@/components/admin/verdict-badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Справочник правил покрытия: все правила доступны сотруднику (врач/регистратура),
// с поиском по услуге и фильтром по страховой. Правила программы идут раньше общих правил СК.
export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ insurer?: string; program?: string; q?: string; page?: string }>
}) {
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const sp = await searchParams
  const page = Number(sp.page ?? "1") || 1
  const [{ rows, total, pageSize }, facets, sources] = await Promise.all([
    coverageCatalog({ insurer: sp.insurer, program: sp.program, q: sp.q, page }),
    coverageFacets(),
    coverageSources(scope.orgId),
  ])
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const link = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ insurer: sp.insurer, program: sp.program, q: sp.q, page: String(page), ...over })) {
      if (v && v !== "1") p.set(k, v)
    }
    const qs = p.toString()
    return qs ? `/coverage?${qs}` : "/coverage"
  }

  return (
    <>
      <PageHeader
        title="Правила покрытия"
        description="Что оплачивает страховая по каждой программе. Источник — актуальные редакции правил и программ; у каждого правила указан пункт документа."
      />

      <CoverageSources
        rows={sources.rows}
        total={sources.total}
        covered={sources.covered}
        coveredShare={sources.coveredShare}
      />

      <p className="mb-3 text-sm">
        <Link href="/coverage/documents" className="text-primary hover:underline">
          Документы условий и обновления →
        </Link>
      </p>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/coverage">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Поиск по услуге: удаление зуб, имплантац…" className="max-w-xs" />
        <select
          name="program"
          defaultValue={sp.program ?? ""}
          className="h-9 max-w-sm rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Все программы</option>
          {facets.programs.map((p) => (
            <option key={`${p.insurerName}-${p.programName}`} value={p.programName ?? ""}>
              {p.programName} — {p.insurerName ?? "?"} ({p.rules})
            </option>
          ))}
        </select>
        {sp.insurer && <input type="hidden" name="insurer" value={sp.insurer} />}
        <button type="submit" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Найти</button>
        <span className="text-sm text-muted-foreground">Найдено: {total}</span>
        {(sp.q || sp.program || sp.insurer) && (
          <Link href="/coverage" className="text-sm text-primary hover:underline">Сбросить</Link>
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={link({ insurer: undefined, page: "1" })} className={`rounded-md border px-2 py-1 ${!sp.insurer ? "bg-accent" : "hover:bg-accent"}`}>
          Все страховые
        </Link>
        {facets.insurers.map((i) => (
          <Link key={i.id} href={link({ insurer: i.id, page: "1" })} className={`rounded-md border px-2 py-1 ${sp.insurer === i.id ? "bg-accent" : "hover:bg-accent"}`}>
            {i.name} <span className="text-muted-foreground">{i.rules}</span>
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Ответ</TableHead>
              <TableHead>Услуга</TableHead>
              <TableHead>Программа</TableHead>
              <TableHead>Условие / лимит</TableHead>
              <TableHead className="w-[220px]">Основание</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Ничего не найдено — измените запрос или выберите другую страховую
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={`${r.clause}-${r.servicePattern}-${i}`}>
                <TableCell>
                  <VerdictBadge verdict={r.verdict} needsReview={r.needsReview} />
                </TableCell>
                <TableCell className="text-sm">
                  {r.servicePattern ?? r.serviceClass}
                  <div className="text-xs text-muted-foreground">{r.serviceClass}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {r.programName ?? <span className="text-muted-foreground">общие правила страховой</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {r.limitAmount && <span className="mr-1 font-medium text-foreground">{r.limitAmount}</span>}
                  {r.conditionText ?? (r.limitAmount ? "" : "—")}
                </TableCell>
                <TableCell className="text-xs">
                  <a href={`/api/original/program-doc/${r.documentId}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {r.clause} 📄
                  </a>
                  {r.documentUrl && (
                    <a href={r.documentUrl} target="_blank" rel="noreferrer" className="ml-1 text-muted-foreground hover:underline" title="Источник на сайте страховой">
                      ↗
                    </a>
                  )}
                  <div className="text-muted-foreground">
                    {r.documentTitle}
                    {r.effectiveFrom ? ` · ред. ${new Date(r.effectiveFrom).toLocaleDateString("ru")}` : ""}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex flex-wrap gap-1 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={link({ page: String(p) })} className={`rounded border px-2 py-1 ${p === page ? "bg-accent font-medium" : "hover:bg-accent"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
