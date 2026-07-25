import Link from "next/link"
import { redirect } from "next/navigation"

// Цифры покрытия считаются при каждом открытии страницы — без кэша.
export const dynamic = "force-dynamic"

import { patientsList } from "@/lib/server/patients/queries"
import { resolveRegistryScope } from "@/lib/server/scope"
import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Пациенты без дублей: одна строка на человека (ФИО + точная дата рождения),
// с текущим прикреплением и действующими гарантийными письмами.
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const scope = await resolveRegistryScope()
  if (!scope.user) redirect("/login")
  const sp = await searchParams
  const page = Number(sp.page ?? "1") || 1
  const { rows, total, pageSize, unmatched } = await patientsList({ orgId: scope.orgId, q: sp.q, page })
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageHeader
        title="Пациенты"
        description="Уникальные пациенты по ФИО и дате рождения. Видно, к какой программе человек прикреплён сейчас и какие гарантийные письма действуют."
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/patients">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Фамилия, год рождения или полис" className="max-w-xs" />
        <button type="submit" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Найти</button>
        <span className="text-sm text-muted-foreground">Найдено: {total}</span>
        {unmatched.noName + unmatched.noBirth > 0 && (
          <span className="text-sm text-muted-foreground">
            · не сопоставлено с пациентом: {unmatched.noName + unmatched.noBirth} записей
            {unmatched.noBirth > 0 ? ` (${unmatched.noBirth} без даты рождения` : " ("}
            {unmatched.noName > 0 ? `${unmatched.noBirth > 0 ? ", " : ""}${unmatched.noName} без ФИО` : ""})
          </span>
        )}
      </form>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пациент</TableHead>
              <TableHead className="w-[130px]">Статус</TableHead>
              <TableHead>Страховая</TableHead>
              <TableHead className="w-[120px]">Действующих ГП</TableHead>
              <TableHead className="w-[100px]">Писем</TableHead>
              <TableHead className="w-[120px]">Последнее</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {sp.q ? "Пациенты не найдены — измените запрос" : "Пациентов пока нет"}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="text-sm">
                  <Link href={`/patients/${r.key}`} className="text-primary hover:underline">
                    {r.fullName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.birthDate as unknown as string).toLocaleDateString("ru")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.attached ? "default" : "outline"}>
                    {r.attached ? "прикреплён" : "откреплён"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{r.insurers || "—"}</TableCell>
                <TableCell className="text-sm">{Number(r.activeGuarantees) || "—"}</TableCell>
                <TableCell className="text-sm">{Number(r.letters)}</TableCell>
                <TableCell className="text-xs">
                  {r.lastDate ? new Date(r.lastDate).toLocaleDateString("ru") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex flex-wrap gap-1 text-sm">
          {Array.from({ length: Math.min(pages, 60) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/patients?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`}
              className={`rounded border px-2 py-1 ${p === page ? "bg-accent font-medium" : "hover:bg-accent"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
