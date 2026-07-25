import type { SourceRow } from "@/lib/server/coverage/sources"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Сводка «страховая — программа — документы — пациентов — правил».
// Покрытие считается по прикреплениям (гарантийные письма не участвуют: там услуги, не программы).
export function CoverageSources({
  rows,
  total,
  covered,
  coveredShare,
}: {
  rows: SourceRow[]
  total: number
  covered: number
  coveredShare: number
}) {
  const gaps = rows.filter((r) => r.rules === 0)
  const gapPatients = gaps.reduce((sum, r) => sum + r.patients, 0)

  return (
    <>
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-base">
            Покрытие правилами: <b>{coveredShare}%</b> пациентов ({covered} из {total})
          </span>
          <span className="text-muted-foreground">
            Программ без документов: <b>{gaps.length}</b> · это <b>{gapPatients}</b> пациентов
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary" style={{ width: `${Math.min(coveredShare, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Считается по письмам прикрепления и открепления — в них указана программа пациента.
          Гарантийные письма в расчёт не входят: в них перечислены конкретные услуги, а не программа.
        </p>
      </Card>

      <details className="mb-6 group" open>
        <summary className="mb-2 cursor-pointer text-sm text-primary hover:underline">
          Подробнее: источники по каждой программе ({rows.length})
        </summary>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">Страховая</TableHead>
              <TableHead>Программа</TableHead>
              <TableHead>Документы</TableHead>
              <TableHead className="w-[110px] text-right">Пациентов</TableHead>
              <TableHead className="w-[90px] text-right">Правил</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Данных о программах пока нет
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={`${r.insurerId}-${r.program}`}>
                <TableCell className="text-sm">{r.insurer}</TableCell>
                <TableCell className="text-sm">
                  {r.program}
                  <div className="text-xs text-muted-foreground">
                    {r.share}% пациентов
                    {r.matchedProgram && r.matchedProgram !== r.program ? ` · правила: ${r.matchedProgram}` : ""}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {r.documents.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {r.documents.map((doc) => (
                        <span key={doc.id}>
                          <a
                            href={`/api/original/program-doc/${doc.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {doc.title}
                          </a>
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 text-muted-foreground hover:underline"
                              title="Источник на сайте страховой"
                            >
                              ↗
                            </a>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="destructive" className="w-fit">документов нет</Badge>
                      {r.reason && <span className="text-muted-foreground">{r.reason}</span>}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">{r.patients}</TableCell>
                <TableCell className="text-right text-sm">{r.rules || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      </details>
    </>
  )
}
