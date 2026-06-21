import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/server/auth/session"
import { getUserMemberships } from "@/lib/server/auth/guards"

// Корень админки → редирект по роли.
export default async function AdminHome() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.isPlatformAdmin) redirect("/admin/clinics")
  const memberships = await getUserMemberships(user.id)
  if (memberships.some((m) => m.role === "owner" && m.status === "active")) redirect("/staff")
  redirect("/registry")
}
