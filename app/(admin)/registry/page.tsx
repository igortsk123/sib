import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, Download, Inbox, Search } from "lucide-react"

import { resolveRegistryScope } from "@/lib/server/scope"
import { listClinics } from "@/lib/server/clinics/queries"
import { countLetters, listInsurerOptions, searchLetters } from "@/lib/server/registry/queries"
import { STATUS_LABELS, SOURCE_LABELS } from "@/lib/letter-status"
import { CARE_TYPE_LABELS } from "@/lib/care-type"
import { ruDate } from "@/lib/format"
import { reviewMessage } from "@/lib/review-hints"
import { PageHeader } from "@/components/admin/page-header"
import { ClinicSelector } from "@/components/admin/clinic-selector"
import { Truncate } from "@/components/admin/truncate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const STATUS_OPTIONS = ["approved", "denied", "detach", "enroll", "annul"]
const SOURCE_OPTIONS = ["body", "pdf", "xlsx", "xls", "rtf", "doc", "archive"]
const CARE_OPTIONS = ["ambulatory", "dentistry", "other"]

export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; insurer?: string; status?: string; careType?: string; source?: string; review?: string; from?: string; to?: string }>
}) {
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const sp = await searchParams
  const f = {
    q: sp.q,
    insurerId: sp.insurer,
    status: sp.status,
    careType: sp.careType,
    source: sp.source,
    review: sp.review,
    dateFrom: sp.from,
    dateTo: sp.to,
    orgId: scope.orgId,
  }
  const total = await countLetters(scope.orgId)
  const rows = await searchLetters(f)
  const insurers = await listInsurerOptions()
  const clinics = scope.isAdmin ? (await listClinics()).map((c) => ({ id: c.id, name: c.name })) : []
  const exportQs = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v)),
  ).toString()

  return (
    <>
      <PageHeader
        title="Реестр гарантийных писем"
        description={`Найдено: ${rows.length} из ${total}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {scope.isAdmin && <ClinicSelector clinics={clinics} current={scope.orgId} />}
            <Button asChild variant="outline" className="gap-2">
              <a href={`/api/registry/export${exportQs ? `?${exportQs}` : ""}`}>
                <Download className="size-4" /> Выгрузить в Excel
              </a>
            </Button>
          </div>
        }
      />

      <form className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-card p-3" action="/registry" method="get">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Поиск: ФИО пациента, полис, № ГП…" className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Проверка</Label>
            <select name="review" defaultValue={sp.review ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Все</option>
              <option value="1">Требует проверки</option>
              <option value="0">Без проверки</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Страховая</Label>
            <select name="insurer" defaultValue={sp.insurer ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Все</option>
              {insurers.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Направление</Label>
            <select name="careType" defaultValue={sp.careType ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Все</option>
              {CARE_OPTIONS.map((s) => (<option key={s} value={s}>{CARE_TYPE_LABELS[s]}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Статус</Label>
            <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Все</option>
              {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{STATUS_LABELS[s]}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Источник</Label>
            <select name="source" defaultValue={sp.source ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Все</option>
              {SOURCE_OPTIONS.map((s) => (<option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Дата с</Label>
            <Input type="date" name="from" defaultValue={sp.from ?? ""} min="2000-01-01" max="2099-12-31" className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Дата по</Label>
            <Input type="date" name="to" defaultValue={sp.to ?? ""} min="2000-01-01" max="2099-12-31" className="h-9" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Применить</Button>
          <Button asChild variant="ghost"><Link href="/registry">Сбросить</Link></Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Inbox className="size-10 text-muted-foreground" aria-hidden />
          <div className="text-sm font-medium">{sp.q ? "Ничего не найдено" : "Реестр пуст"}</div>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          {/* Table сам оборачивает в overflow-x-auto контейнер — двойную обёртку Card НЕ используем (ломала скролл). */}
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-center" title="Требует проверки">⚑</TableHead>
                <TableHead>Пациент</TableHead>
                <TableHead>Страховая</TableHead>
                <TableHead>Направление</TableHead>
                <TableHead>Полис</TableHead>
                <TableHead>№ ГП</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="text-center">
                    {r.needsReview && (
                      <span title={reviewMessage(r.reviewNote)} className="inline-flex">
                        <AlertTriangle className="size-4 text-warning" aria-label="Требует проверки" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/registry/${r.id}`} className="text-primary hover:underline">
                      {r.patient ?? "— (требует проверки)"}
                    </Link>
                  </TableCell>
                  <TableCell><Truncate text={r.insurer ?? ""} width="max-w-[150px]" /></TableCell>
                  <TableCell className="text-muted-foreground">{CARE_TYPE_LABELS[r.careType ?? ""] ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.policy ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.letterNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "secondary" : "outline"}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{SOURCE_LABELS[r.source ?? ""] ?? r.source}</TableCell>
                  <TableCell className="text-muted-foreground">{ruDate(r.letterDate) || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
