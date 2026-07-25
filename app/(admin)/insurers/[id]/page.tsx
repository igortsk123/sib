import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { getCurrentUser } from "@/lib/server/auth/session"
import { documentsWithChecks } from "@/lib/server/coverage/documents"
import { getInsurer, listTemplates, templateJournalByType } from "@/lib/server/templates/queries"
import { PageHeader } from "@/components/admin/page-header"
import { DocTypeTemplates, type TemplateRow } from "@/components/admin/doctype-templates"
import { ProgramDocumentsTable } from "@/components/admin/program-documents-table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default async function InsurerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.isPlatformAdmin) redirect("/insurers") // настройка шаблонов — только платформенный админ
  const { id } = await params
  const insurer = await getInsurer(id)
  if (!insurer) notFound()

  const [templates, journal, docs] = await Promise.all([
    listTemplates(id),
    templateJournalByType(insurer.name),
    documentsWithChecks(id),
  ])
  const rows: TemplateRow[] = templates.map((t) => {
    const j = journal[t.docType]
    return {
      id: t.id,
      docType: t.docType,
      status: t.status,
      sampleStoragePath: t.sampleStoragePath,
      sampleFilename: t.sampleFilename,
      sampleSubject: t.sampleSubject,
      sampleText: t.sampleText,
      records: j?.n ?? 0,
      methods: j?.methods ?? {},
      gaps: j?.gaps ?? {},
    }
  })
  const totalRules = docs.reduce((sum, d) => sum + Number(d.rules), 0)

  return (
    <>
      <PageHeader
        title={insurer.name}
        description="Распознавание писем по типам документов и условия страхования: документы, из которых извлечены правила покрытия."
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

      <Tabs defaultValue="templates">
        <TabsList className="mb-4">
          <TabsTrigger value="templates">Шаблоны и типы документов</TabsTrigger>
          <TabsTrigger value="conditions">
            Документы условий {docs.length > 0 ? `(${docs.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <DocTypeTemplates insurerId={id} templates={rows} />
        </TabsContent>

        <TabsContent value="conditions">
          <p className="mb-3 text-sm text-muted-foreground">
            Правила и программы этой страховой: из них извлечено <b>{totalRules}</b> правил покрытия.
            Источники проверяются автоматически по понедельникам в 06:30 — история проверок ниже.
          </p>
          <ProgramDocumentsTable rows={docs} showInsurer={false} />
        </TabsContent>
      </Tabs>
    </>
  )
}
