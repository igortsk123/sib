import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { requirePlatformAdmin } from "@/lib/server/auth/guards"
import { getClinic, listMembers } from "@/lib/server/clinics/queries"
import { ROLE_LABELS } from "@/lib/roles"
import { PageHeader } from "@/components/admin/page-header"
import { AddClinicAdminDialog } from "@/components/admin/add-clinic-admin-dialog"
import { AddStaffDialog } from "@/components/admin/add-staff-dialog"
import { StaffEmailCell } from "@/components/admin/staff-email-cell"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) redirect("/")
  const { id } = await params
  const clinic = await getClinic(id)
  if (!clinic) notFound()
  const members = await listMembers(id)

  return (
    <>
      <Link href="/admin/clinics" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Все клиники
      </Link>
      <PageHeader
        title={clinic.name}
        description="Назначьте администратора клиники и добавьте сотрудников."
        action={
          <div className="flex flex-wrap gap-2">
            <AddClinicAdminDialog organizationId={id} />
            <AddStaffDialog organizationId={id} />
          </div>
        }
      />
      {members.length === 0 ? (
        <Card className="grid place-items-center p-12 text-center text-sm text-muted-foreground">
          В клинике пока нет участников. Назначьте администратора клиники.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Участник</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Почта</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">{m.name ?? "—"}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell>
                    <StaffEmailCell organizationId={id} userId={m.userId} email={m.email} />
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" ? (
                      <Badge>{ROLE_LABELS.owner}</Badge>
                    ) : (
                      ROLE_LABELS[m.role]
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "secondary" : "outline"}>
                      {m.status === "active" ? "активен" : m.status === "invited" ? "приглашён" : "заблокирован"}
                    </Badge>
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
