import Link from "next/link"

import type { SourceRow } from "@/lib/server/coverage/sources"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Баннер покрытия: цифра, полоска и кнопка «Детали» — подробная таблица открывается
// отдельной страницей /coverage/sources, чтобы не растягивать основной экран.
export function CoverageSummary({
  total,
  covered,
  coveredShare,
  gaps,
  gapPatients,
  showDetailsLink = true,
}: {
  total: number
  covered: number
  coveredShare: number
  gaps: number
  gapPatients: number
  /** На самой странице деталей кнопка не нужна — она вела бы на текущую страницу. */
  showDetailsLink?: boolean
}) {
  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-base">
          Покрытие правилами: <b>{coveredShare}%</b> пациентов ({covered} из {total})
        </span>
        <span className="text-muted-foreground">
          Программ без документов: <b>{gaps}</b> · это <b>{gapPatients}</b> пациентов
        </span>
        {showDetailsLink && (
          <Link
            href="/coverage/sources"
            className="rounded-md border px-3 py-1 text-sm text-primary hover:bg-accent"
          >
            Детали
          </Link>
        )}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
        <div className="h-full bg-primary" style={{ width: `${Math.min(coveredShare, 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Считается по письмам прикрепления и открепления — в них указана программа пациента.
        Гарантийные письма в расчёт не входят: там конкретные услуги, а не программа.
      </p>
    </Card>
  )
}

// Подробная таблица источников: страховая, пациентов, правил, программа, документы.
export function CoverageSourcesTable({ rows }: { rows: SourceRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <Table className="w-full max-w-full table-fixed text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[15%] whitespace-normal">Страховая</TableHead>
            <TableHead className="w-[10%] whitespace-normal text-right">Пациентов</TableHead>
            <TableHead className="w-[8%] whitespace-normal text-right">Правил</TableHead>
            <TableHead className="w-[29%] whitespace-normal">Программа</TableHead>
            <TableHead className="w-[38%] whitespace-normal">Документы</TableHead>
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
              <TableCell className="whitespace-normal break-words text-xs">{r.insurer}</TableCell>
              <TableCell className="whitespace-normal text-right">{r.patients}</TableCell>
              <TableCell className="whitespace-normal text-right">{r.rules || "—"}</TableCell>
              <TableCell className="whitespace-normal break-words text-xs">
                {r.program}
                <div className="text-muted-foreground">
                  {r.share}%
                  {r.matchedProgram && r.matchedProgram !== r.program ? ` · правила: ${r.matchedProgram}` : ""}
                </div>
              </TableCell>
              <TableCell className="whitespace-normal break-words text-xs">
                {r.documents.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {r.documents.map((doc) => (
                      <span key={doc.id}>
                        <a
                          href={`/api/original/program-doc/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="whitespace-normal break-words text-primary hover:underline"
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
