import Link from "next/link"
import { redirect } from "next/navigation"

// Цифры покрытия считаются при каждом открытии страницы — без кэша.
export const dynamic = "force-dynamic"

import { coverageSources } from "@/lib/server/coverage/sources"
import { resolveRegistryScope } from "@/lib/server/scope"
import { CoverageSourcesTable, CoverageSummary } from "@/components/admin/coverage-sources"
import { PageHeader } from "@/components/admin/page-header"

// Детальная сводка источников: по каждой программе — сколько пациентов, сколько правил,
// какие документы и почему документа нет. Открывается кнопкой «Детали» со страницы правил.
export default async function CoverageSourcesPage() {
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const sources = await coverageSources(scope.orgId)
  const gaps = sources.rows.filter((r) => r.rules === 0)

  return (
    <>
      <Link href="/coverage" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← К правилам покрытия
      </Link>
      <PageHeader
        title="Источники и покрытие"
        description="По каждой программе из писем: сколько пациентов, сколько правил извлечено и из каких документов. Где документа нет — указана причина."
      />
      <CoverageSummary
        total={sources.total}
        covered={sources.covered}
        coveredShare={sources.coveredShare}
        gaps={gaps.length}
        gapPatients={gaps.reduce((sum, r) => sum + r.patients, 0)}
        showDetailsLink={false}
      />
      <CoverageSourcesTable rows={sources.rows} />
      <p className="mt-3 text-xs text-muted-foreground">
        Данные пересчитаны {new Date().toLocaleString("ru", { dateStyle: "short", timeStyle: "short" })} —
        при каждом открытии страницы, по текущему состоянию писем и правил.
      </p>
    </>
  )
}
