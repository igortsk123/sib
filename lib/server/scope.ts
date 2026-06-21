import "server-only"
import { cookies } from "next/headers"

import { getUserMemberships } from "./auth/guards"
import { getCurrentUser } from "./auth/session"

export const ACTIVE_ORG_COOKIE = "sib_active_org"

export async function getActiveOrg(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(ACTIVE_ORG_COOKIE)?.value || null
}

// Скоуп реестра: какой orgId фильтровать.
//  - платформенный админ: выбранная клиника (cookie) или null = ВСЕ клиники;
//  - сотрудник клиники: его клиника; нет клиники → "__none__" (ничего не видит).
export async function resolveRegistryScope() {
  const user = await getCurrentUser()
  if (!user) return { user: null, orgId: "__none__" as string | null, isAdmin: false }
  if (user.isPlatformAdmin) {
    return { user, orgId: await getActiveOrg(), isAdmin: true }
  }
  const ms = await getUserMemberships(user.id)
  const m = ms.find((x) => x.status === "active")
  return { user, orgId: m?.organizationId ?? "__none__", isAdmin: false }
}
