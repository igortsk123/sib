import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, Download, Inbox, Search } from "lucide-react"

import { resolveRegistryScope } from "@/lib/server/scope"
import { listClinics } from "@/lib/server/clinics/queries"
import { countLetters, searchLetters } from "@/lib/server/registry/queries"
import { STATUS_LABELS, SOURCE_LABELS } from "@/lib/letter-status"
import { PageHeader } from "@/components/admin/page-header"
import { ClinicSelector } from "@/components/admin/clinic-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const { q } = await searchParams
  const total = await countLetters(scope.orgId)
  const rows = await searchLetters({ q, orgId: scope.orgId })
  const clinics = scope.isAdmin ? (await listClinics()).map((c) => ({ id: c.id, name: c.name })) : []

  return (
    <>
      <PageHeader
        title="Реестр гарантийных писем"
        description={`Всего записей: ${total}. Поиск по пациенту, полису, № ГП, страховой.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {scope.isAdmin && <ClinicSelector clinics={clinics} current={scope.orgId} />}
            <Button asChild variant="outline" className="gap-2">
              <a href={`/api/registry/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}>
                <Download className="size-4" /> Выгрузить в Excel
              </a>
            </Button>
          </div>
        }
      />

      <form className="mb-4 flex gap-2" action="/registry" method="get">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="ФИО пациента, полис, № ГП, страховая…" className="pl-9" />
        </div>
        <Button type="submit">Найти</Button>
      </form>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Inbox className="size-10 text-muted-foreground" aria-hidden />
          <div className="text-sm font-medium">{q ? "Ничего не найдено" : "Реестр пуст"}</div>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пациент</TableHead>
                <TableHead>Страховая</TableHead>
                <TableHead>Полис</TableHead>
                <TableHead>№ ГП</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Проверка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/registry/${r.id}`} className="text-primary hover:underline">
                      {r.patient ?? "— (требует проверки)"}
                    </Link>
                  </TableCell>
                  <TableCell>{r.insurer ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.policy ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.letterNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "secondary" : r.status === "denied" ? "outline" : "outline"}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{SOURCE_LABELS[r.source ?? ""] ?? r.source}</TableCell>
                  <TableCell className="text-muted-foreground">{r.letterDate ?? "—"}</TableCell>
                  <TableCell>
                    {r.needsReview ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning" title={r.reviewNote ?? "Проверьте перед переносом в систему"}>
                        <AlertTriangle className="size-3.5" /> Проверить
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">ok</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
