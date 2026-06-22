import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { getCurrentUser } from "@/lib/server/auth/session"
import { driftCountByType, getInsurer, listTemplates } from "@/lib/server/templates/queries"
import { PageHeader } from "@/components/admin/page-header"
import { DocTypeTemplates, type TemplateRow } from "@/components/admin/doctype-templates"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function InsurerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.isPlatformAdmin) redirect("/insurers") // настройка шаблонов — только платформенный админ
  const { id } = await params
  const insurer = await getInsurer(id)
  if (!insurer) notFound()

  const [templates, drift] = await Promise.all([listTemplates(id), driftCountByType(insurer.name)])
  const rows: TemplateRow[] = templates.map((t) => ({
    id: t.id,
    docType: t.docType,
    status: t.status,
    sampleStoragePath: t.sampleStoragePath,
    sampleFilename: t.sampleFilename,
    goldJson: t.goldJson ?? null,
    drift: drift[t.docType] ?? 0,
  }))

  return (
    <>
      <PageHeader
        title={insurer.name}
        description="Настройка распознавания по типам документов: образец → LLM-эталон → парсер; дрейф из журнала разбора."
        action={
          <Link href="/insurers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Все страховые
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1">
        {insurer.domains.length ? (
          insurer.domains.map((d) => (
            <Badge key={d} variant="outline" className="font-mono text-xs">{d}</Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">домены не заданы</span>
        )}
      </div>
      <DocTypeTemplates insurerId={id} templates={rows} />
    </>
  )
}
