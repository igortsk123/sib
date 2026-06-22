import "server-only"
import { desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { appUser, membership, organization } from "@/lib/db/schema"

// Список клиник с числом сотрудников (для платформенного админа).
export async function listClinics() {
  return db()
    .select({
      id: organization.id,
      name: organization.name,
      status: organization.status,
      createdAt: organization.createdAt,
      members: sql<number>`count(${membership.id})::int`,
    })
    .from(organization)
    .leftJoin(membership, eq(membership.organizationId, organization.id))
    .groupBy(organization.id)
    .orderBy(desc(organization.createdAt))
}

export async function getClinic(id: string) {
  const rows = await db().select().from(organization).where(eq(organization.id, id)).limit(1)
  return rows[0] ?? null
}

// Все участники клиники (админы + сотрудники) с ролью и статусом.
export async function listMembers(organizationId: string) {
  return db()
    .select({
      userId: appUser.id,
      name: appUser.name,
      phone: appUser.phone,
      email: appUser.email,
      role: membership.role,
      status: membership.status,
    })
    .from(membership)
    .innerJoin(appUser, eq(appUser.id, membership.userId))
    .where(eq(membership.organizationId, organizationId))
    .orderBy(desc(membership.createdAt))
}
