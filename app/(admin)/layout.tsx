import { redirect } from "next/navigation"

import { env } from "@/lib/env"
import { getCurrentUser } from "@/lib/server/auth/session"
import { getUserMemberships } from "@/lib/server/auth/guards"
import { normalizePhone } from "@/lib/server/auth/phone"
import { AdminShell, type NavRole } from "@/components/admin/shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  // Демо-стенд: тест-пользователь видит постоянный баннер (данные вымышлены — план demo-stand).
  const isDemo = Boolean(env.TEST_LOGIN_PHONE) && user.phone === normalizePhone(env.TEST_LOGIN_PHONE)

  const memberships = await getUserMemberships(user.id)
  const isOwner = memberships.some((m) => m.role === "owner" && m.status === "active")

  const role: NavRole = user.isPlatformAdmin ? "platform" : isOwner ? "owner" : "staff"
  const roleLabel = user.isPlatformAdmin
    ? "Платформенный администратор"
    : isOwner
      ? "Администратор клиники"
      : "Сотрудник"

  return (
    <>
      {isDemo && (
        <div className="border-b border-warning/40 bg-warning/15 px-4 py-1.5 text-center text-xs font-medium">
          ДЕМО-ДАННЫЕ: все пациенты, полисы и документы на этом стенде вымышлены
        </div>
      )}
      <AdminShell user={{ name: user.name, phone: user.phone, roleLabel }} role={role}>
        {children}
      </AdminShell>
    </>
  )
}
