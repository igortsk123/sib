import { redirect } from "next/navigation"

import { env } from "@/lib/env"
import { getCurrentUser } from "@/lib/server/auth/session"
import { getUserMemberships } from "@/lib/server/auth/guards"
import { normalizePhone } from "@/lib/server/auth/phone"
import { AdminShell, type NavRole } from "@/components/admin/shell"
import { db } from "@/lib/db"
import { organization } from "@/lib/db/schema"
import { getActiveOrg } from "@/lib/server/scope"
import { asc } from "drizzle-orm"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  // Демо-стенд: тест-пользователь видит постоянный баннер (данные вымышлены — план demo-stand).
  const isDemo = Boolean(env.TEST_LOGIN_PHONE) && user.phone === normalizePhone(env.TEST_LOGIN_PHONE)

  const memberships = await getUserMemberships(user.id)
  const isOwner = memberships.some((m) => m.role === "owner" && m.status === "active")

  const role: NavRole = user.isPlatformAdmin ? "platform" : isOwner ? "owner" : "staff"

  // Выбор клиники — ГЛОБАЛЬНЫЙ (в шапке): контекст действует во всех разделах, а не только
  // в реестре, иначе при тестировании легко остаться в демо-клинике и этого не заметить.
  const clinics = user.isPlatformAdmin
    ? await db().select({ id: organization.id, name: organization.name }).from(organization).orderBy(asc(organization.name))
    : []
  const activeOrg = user.isPlatformAdmin ? await getActiveOrg() : null
  const roleLabel = user.isPlatformAdmin
    ? "Платформенный администратор"
    : isOwner
      ? "Администратор клиники"
      : "Сотрудник"

  return (
    <>
      {isDemo && (
        <div className="sticky top-0 z-50 border-b border-warning/40 bg-warning/15 px-4 py-1.5 text-center text-xs font-medium backdrop-blur">
          <span className="mr-2">ДЕМО-ДАННЫЕ: все пациенты, полисы и документы на этом стенде вымышлены.</span>
          <span className="font-semibold">Подключить свою клинику:</span>{" "}
          <a href="tg://resolve?domain=igortsk" className="underline underline-offset-2">Telegram @igortsk</a>
          {" · "}
          <a href="https://api.whatsapp.com/send?phone=79234079168" className="underline underline-offset-2">
            WhatsApp +7-923-407-9168
          </a>
          {" · "}
          <a href="https://max.ru" className="underline underline-offset-2">MAX +7-923-409-7976</a>
          {" · тел. "}
          <a href="tel:+79234097976" className="underline underline-offset-2">+7-923-409-7976</a>
        </div>
      )}
      <AdminShell
        user={{ name: user.name, phone: user.phone, roleLabel }}
        role={role}
        clinics={clinics}
        activeOrg={activeOrg}
      >
        {children}
      </AdminShell>
    </>
  )
}
