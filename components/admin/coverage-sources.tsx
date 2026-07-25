import type { SourceRow } from "@/lib/server/coverage/sources"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Сводка «страховая — программа — источник — покрытие»: сразу видно, по каким программам
// правила есть, а где источника нет (и сколько пациентов это затрагивает).
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
            Программ без источника: <b>{gaps.length}</b> · затрагивают <b>{gapPatients}</b> пациентов
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
          <div className="h-full bg-primary" style={{ width: `${Math.min(coveredShare, 100)}%` }} />
        </div>
      </Card>

      <Card className="mb-6 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Страховая</TableHead>
              <TableHead>Программа (как в письмах)</TableHead>
              <TableHead className="w-[110px]">Пациентов</TableHead>
              <TableHead className="w-[90px]">Доля</TableHead>
              <TableHead className="w-[90px]">Правил</TableHead>
              <TableHead>Источник</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Данных о программах пока нет
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={`${r.insurerId}-${r.alias}`}>
                <TableCell className="text-sm">{r.insurer}</TableCell>
                <TableCell className="text-sm">
                  {r.alias}
                  {r.programName && r.programName !== r.alias && (
                    <div className="text-xs text-muted-foreground">→ {r.programName}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm">{r.patients}</TableCell>
                <TableCell className="text-sm">{r.share}%</TableCell>
                <TableCell className="text-sm">{r.rules || "—"}</TableCell>
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
                            {doc.title} 📄
                          </a>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noreferrer" className="ml-1 text-muted-foreground hover:underline">
                              ↗
                            </a>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="destructive">источника нет</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
