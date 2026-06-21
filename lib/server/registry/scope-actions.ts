"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { requirePlatformAdmin } from "@/lib/server/auth/guards"
import { ACTIVE_ORG_COOKIE } from "@/lib/server/scope"

// Платформенный админ выбирает активную клинику (контекст реестра). "" = все клиники.
export async function setActiveOrg(orgId: string) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return
  const jar = await cookies()
  if (!orgId) jar.delete(ACTIVE_ORG_COOKIE)
  else jar.set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" })
  revalidatePath("/registry")
}
