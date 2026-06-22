import { asc } from "drizzle-orm"

import { db } from "@/lib/db"
import { insuranceCompany } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/server/auth/session"
import { parserGapsByInsurer } from "@/lib/server/templates/queries"
import { FIELD_HINTS } from "@/lib/review-hints"
import { PageHeader } from "@/components/admin/page-header"
import { CreateInsurerDialog } from "@/components/admin/create-insurer-dialog"
import { DomainsEditor } from "@/components/admin/domains-editor"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function InsurersPage() {
  const user = await getCurrentUser()
  const isAdmin = Boolean(user?.isPlatformAdmin)
  const companies = await db().select().from(insuranceCompany).orderBy(asc(insuranceCompany.name))
  const gaps = await parserGapsByInsurer()
  const gapText = (name: string) => {
    const g = gaps[name]
    if (!g || !Object.keys(g).length) return null
    return Object.entries(g)
      .sort((a, b) => b[1] - a[1])
      .map(([f, c]) => `${FIELD_HINTS[f] ?? f} ×${c}`)
      .join(", ")
  }

  return (
    <>
      <PageHeader
        title="Страховые компании"
        description="Реестр для идентификации писем по домену отправителя. Заполнен по реальному тестовому набору."
        action={isAdmin ? <CreateInsurerDialog /> : undefined}
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Страховая</TableHead>
              <TableHead>Домены отправителей</TableHead>
              <TableHead>Не распознано парсером</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="align-top font-medium">
                  {isAdmin ? (
                    <a href={`/insurers/${c.id}`} className="text-primary underline-offset-2 hover:underline">
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {isAdmin ? (
                    <DomainsEditor id={c.id} domains={c.domains} />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {c.domains.map((d) => (
                        <Badge key={d} variant="outline" className="font-mono text-xs">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top text-xs text-muted-foreground">
                  {gapText(c.name) ?? <span className="text-muted-foreground/50">всё парсером</span>}
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={c.active ? "secondary" : "outline"}>
                    {c.active ? "активна" : "выключена"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
