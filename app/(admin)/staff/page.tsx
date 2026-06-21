import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/server/auth/session"
import { getUserMemberships } from "@/lib/server/auth/guards"
import { listStaff } from "@/lib/server/staff/queries"
import { ROLE_LABELS } from "@/lib/roles"
import { PageHeader } from "@/components/admin/page-header"
import { AddStaffDialog } from "@/components/admin/add-staff-dialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function StaffPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const memberships = await getUserMemberships(user.id)
  const owned = memberships.find((m) => m.role === "owner" && m.status === "active")
  if (!owned) {
    return (
      <Card className="grid place-items-center p-12 text-center text-sm text-muted-foreground">
        У вас нет клиники во владении. Обратитесь к платформенному администратору.
      </Card>
    )
  }
  const staff = await listStaff(owned.organizationId)

  return (
    <>
      <PageHeader
        title="Сотрудники"
        description={owned.orgName}
        action={<AddStaffDialog organizationId={owned.organizationId} />}
      />
      {staff.length === 0 ? (
        <Card className="grid place-items-center p-12 text-center text-sm text-muted-foreground">
          Пока нет сотрудников. Нажмите «Добавить сотрудника».
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.userId}>
                  <TableCell className="font-medium">{s.name ?? "—"}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{ROLE_LABELS[s.role]}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "secondary" : "outline"}>
                      {s.status === "active" ? "активен" : s.status === "invited" ? "приглашён" : "заблокирован"}
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
