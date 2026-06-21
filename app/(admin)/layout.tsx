import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/server/auth/session"
import { getUserMemberships } from "@/lib/server/auth/guards"
import { AdminShell, type NavRole } from "@/components/admin/shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const memberships = await getUserMemberships(user.id)
  const isOwner = memberships.some((m) => m.role === "owner" && m.status === "active")

  const role: NavRole = user.isPlatformAdmin ? "platform" : isOwner ? "owner" : "staff"
  const roleLabel = user.isPlatformAdmin
    ? "Платформенный администратор"
    : isOwner
      ? "Владелец клиники"
      : "Сотрудник"

  return (
    <AdminShell user={{ name: user.name, phone: user.phone, roleLabel }} role={role}>
      {children}
    </AdminShell>
  )
}
