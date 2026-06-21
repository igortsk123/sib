import { redirect } from "next/navigation"

import Link from "next/link"

import { requirePlatformAdmin } from "@/lib/server/auth/guards"
import { listClinics } from "@/lib/server/clinics/queries"
import { PageHeader } from "@/components/admin/page-header"
import { CreateClinicDialog } from "@/components/admin/create-clinic-dialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ClinicsPage() {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) redirect("/")
  const clinics = await listClinics()

  return (
    <>
      <PageHeader
        title="Клиники"
        description="Платформенный администратор заводит клиники и назначает владельца."
        action={<CreateClinicDialog />}
      />
      {clinics.length === 0 ? (
        <Card className="grid place-items-center p-12 text-center text-sm text-muted-foreground">
          Пока нет клиник. Нажмите «Добавить клинику».
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиника</TableHead>
                <TableHead>Сотрудников</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/clinics/${c.id}`} className="text-primary hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>{c.members}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "secondary" : "outline"}>
                      {c.status === "active" ? "активна" : "заблокирована"}
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
