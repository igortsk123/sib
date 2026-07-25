import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/server/auth/session"
import { checkSummary, documentsWithChecks } from "@/lib/server/coverage/documents"
import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  unchanged: { label: "файл тот же", variant: "outline" },
  updated: { label: "обновлён", variant: "default" },
  failed: { label: "ошибка", variant: "destructive" },
  skipped: { label: "нечего проверять", variant: "secondary" },
}

const dt = (value: Date | string | null) => (value ? new Date(value).toLocaleString("ru", { dateStyle: "short", timeStyle: "short" }) : "—")

// Документы условий и история их еженедельных проверок: видно, когда смотрели источник,
// был ли файл тем же и когда вышла новая редакция.
export default async function CoverageDocumentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const [docs, summary] = await Promise.all([documentsWithChecks(), checkSummary()])

  return (
    <>
      <Link href="/coverage" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        ← К правилам покрытия
      </Link>
      <PageHeader
        title="Документы условий и обновления"
        description="Источники правил: что скачано, когда проверялось и что изменилось. Проверка автоматическая, по понедельникам в 06:30."
      />

      <Card className="mb-4 p-4 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>Последняя проверка: <b>{dt(summary.lastCheckedAt)}</b></span>
          <span>Файл не менялся: <b>{summary.byStatus.unchanged ?? 0}</b></span>
          <span>Обновлений: <b>{summary.byStatus.updated ?? 0}</b></span>
          <span>Ошибок: <b>{summary.byStatus.failed ?? 0}</b></span>
          <span>Правил на сверке: <b>{summary.pendingReview}</b></span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Документ</TableHead>
              <TableHead className="w-[10%]">Правил</TableHead>
              <TableHead className="w-[13%]">Проверен</TableHead>
              <TableHead className="w-[28%]">История проверок</TableHead>
              <TableHead className="w-[15%]">Файлы</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Документы ещё не загружены
                </TableCell>
              </TableRow>
            )}
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="break-words text-sm">
                  {d.title}
                  <div className="text-xs text-muted-foreground">
                    {d.insurer ?? "—"} · {d.pages} стр.
                    {d.versions > 1 ? ` · редакций: ${d.versions}` : ""}
                    {d.effectiveFrom ? ` · действует с ${new Date(d.effectiveFrom).toLocaleDateString("ru")}` : ""}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {d.rules}
                  {d.needsReview > 0 && (
                    <Badge variant="outline" className="ml-1">
                      на сверке: {d.needsReview}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="break-words text-xs">{dt(d.lastCheckedAt)}</TableCell>
                <TableCell className="break-words text-xs">
                  {d.checks.length === 0 ? (
                    <span className="text-muted-foreground">ещё не проверялся</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {d.checks.map((c, i) => (
                        <span key={i} className="flex flex-wrap items-center gap-1">
                          <Badge variant={STATUS[c.status]?.variant ?? "outline"}>
                            {STATUS[c.status]?.label ?? c.status}
                          </Badge>
                          <span className="text-muted-foreground">{dt(c.checkedAt)}</span>
                          {c.message && <span className="text-muted-foreground">· {c.message}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="break-words text-xs">
                  {d.storagePath && (
                    <a href={`/api/original/program-doc/${d.id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      наша копия 📄
                    </a>
                  )}
                  <div>
                    <a href={d.fileUrl ?? d.sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
                      источник ↗
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
