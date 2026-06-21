import "server-only"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { membership, organization } from "@/lib/db/schema"
import { getCurrentUser } from "./session"

type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
export type Guard<T> = { ok: true; user: T } | { ok: false; error: string }

// ВАЖНО: server action — публичный POST. Проверка роли в layout защищает только отрисовку,
// не вызов экшена. Поэтому каждую мутацию гейтим здесь.

export async function requireUser(): Promise<Guard<SessionUser>> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Сессия не найдена — войдите заново" }
  if (user.status !== "active") return { ok: false, error: "Учётная запись заблокирована" }
  return { ok: true, user }
}

export async function requirePlatformAdmin(): Promise<Guard<SessionUser>> {
  const auth = await requireUser()
  if (!auth.ok) return auth
  if (!auth.user.isPlatformAdmin) return { ok: false, error: "Доступ только для платформенного администратора" }
  return auth
}

// Список клиник пользователя с ролью (для навигации/контекста).
export async function getUserMemberships(userId: string) {
  return db()
    .select({
      organizationId: membership.organizationId,
      role: membership.role,
      status: membership.status,
      orgName: organization.name,
    })
    .from(membership)
    .innerJoin(organization, eq(organization.id, membership.organizationId))
    .where(eq(membership.userId, userId))
}

// Требуется роль `owner` в клинике orgId (или платформенный админ).
export async function requireClinicOwner(orgId: string): Promise<Guard<SessionUser>> {
  const auth = await requireUser()
  if (!auth.ok) return auth
  if (auth.user.isPlatformAdmin) return auth
  const rows = await db()
    .select({ role: membership.role })
    .from(membership)
    .where(
      and(
        eq(membership.userId, auth.user.id),
        eq(membership.organizationId, orgId),
        eq(membership.status, "active"),
      ),
    )
    .limit(1)
  if (rows[0]?.role !== "owner") return { ok: false, error: "Нужны права владельца клиники" }
  return auth
}
