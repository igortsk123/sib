import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Документы условий страховой и история их еженедельных проверок.
// Используется во вкладке карточки страховой и на общей странице /coverage/documents.

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  unchanged: { label: "файл тот же", variant: "outline" },
  updated: { label: "обновлён", variant: "default" },
  failed: { label: "ошибка", variant: "destructive" },
  skipped: { label: "нечего проверять", variant: "secondary" },
}

export type ProgramDocRow = {
  id: string
  title: string
  insurer: string | null
  sourceUrl: string
  fileUrl: string | null
  storagePath: string | null
  effectiveFrom: string | Date | null
  lastCheckedAt: string | Date | null
  rules: number
  needsReview: number
  pages: number
  versions: number
  checks: { checkedAt: string | Date; status: string; message: string | null }[]
}

const dt = (value: string | Date | null) =>
  value ? new Date(value).toLocaleString("ru", { dateStyle: "short", timeStyle: "short" }) : "—"

export function ProgramDocumentsTable({ rows, showInsurer = true }: { rows: ProgramDocRow[]; showInsurer?: boolean }) {
  return (
    <Card className="overflow-hidden p-0">
      <Table className="w-full max-w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[34%] whitespace-normal">Документ</TableHead>
            <TableHead className="w-[10%] whitespace-normal">Правил</TableHead>
            <TableHead className="w-[13%] whitespace-normal">Проверен</TableHead>
            <TableHead className="w-[28%] whitespace-normal">История проверок</TableHead>
            <TableHead className="w-[15%] whitespace-normal">Файлы</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Документов условий пока нет — ожидается загрузка клиникой или поиск в открытых источниках
              </TableCell>
            </TableRow>
          )}
          {rows.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="whitespace-normal break-words text-sm">
                {d.title}
                <div className="text-xs text-muted-foreground">
                  {showInsurer && d.insurer ? `${d.insurer} · ` : ""}
                  {d.pages} стр.
                  {d.versions > 1 ? ` · редакций: ${d.versions}` : ""}
                  {d.effectiveFrom ? ` · действует с ${new Date(d.effectiveFrom).toLocaleDateString("ru")}` : ""}
                </div>
              </TableCell>
              <TableCell className="whitespace-normal text-sm">
                {d.rules}
                {d.needsReview > 0 && (
                  <Badge variant="outline" className="ml-1">на сверке: {d.needsReview}</Badge>
                )}
              </TableCell>
              <TableCell className="whitespace-normal break-words text-xs">{dt(d.lastCheckedAt)}</TableCell>
              <TableCell className="whitespace-normal break-words text-xs">
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
              <TableCell className="whitespace-normal break-words text-xs">
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
  )
}
