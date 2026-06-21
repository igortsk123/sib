import "server-only"
import { desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { membership, organization } from "@/lib/db/schema"

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
