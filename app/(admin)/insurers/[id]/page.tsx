import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { getCurrentUser } from "@/lib/server/auth/session"
import { documentsWithChecks } from "@/lib/server/coverage/documents"
import { recognitionMap } from "@/lib/server/insurers/recognition"
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

  const [templates, journal, docs, recog] = await Promise.all([
    listTemplates(id),
    templateJournalByType(insurer.name),
    documentsWithChecks(id),
    recognitionMap(id),
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
          <TabsTrigger value="recognition">
            Распознавание и программы {recog.programs.length > 0 ? `(${recog.programs.length})` : ""}
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

        <TabsContent value="recognition" className="flex flex-col gap-4">
          <section>
            <h3 className="mb-2 text-sm font-medium">Как разбираются письма (тип документа → способ)</h3>
            {recog.parsing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Карта разбора не заведена — письма идут через LLM. Появился устойчивый бланк →
                написать детерминированный парсер (методика: guides/onboarding.md).
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {recog.parsing.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-2">
                    <span>{p.doc}</span>
                    <Badge variant={p.how.startsWith("парсер") || p.how.startsWith("встроенный") ? "default" : "secondary"} className="text-xs">
                      {p.how}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recog.exceptions.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium">Исключения распознавания (правила владельца)</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {recog.exceptions.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">
                Авто-сверка учитывает эти правила при каждом прогоне очереди «проверить».
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-medium">Реестр правил на сайте страховой</h3>
            {recog.registryUrl ? (
              <p className="text-sm">
                <a href={recog.registryUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                  {recog.registryUrl}
                </a>
                <span className="text-muted-foreground"> — еженедельно сверяется registry-watch: новые редакции ДМС-правил обнаруживаются и скачиваются автоматически.</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{recog.registryNote ?? "реестр не заведён — добавить registryUrl в настройки страховой"}</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium">Типы программ (актуальные редакции)</h3>
            {recog.programs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Правила покрытия не заведены.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {recog.programs.map((p) => (
                  <li key={p.name}>
                    {p.name} <span className="text-muted-foreground">— {p.rules} правил</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recog.aliases.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium">Строки программ из писем ({recog.aliases.length})</h3>
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-xs">
                {recog.aliases.map((a) => (
                  <li key={a.alias} className="flex flex-wrap items-baseline gap-1">
                    <span className="font-mono">{a.alias}</span>
                    <span className="text-muted-foreground">
                      → {a.program ?? (a.kind === "service" ? "услуга (не программа)" : a.kind === "other" ? "техническая строка" : a.note ?? "—")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
