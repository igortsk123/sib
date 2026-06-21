import "server-only"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appUser, membership } from "@/lib/db/schema"

// Сотрудники клиники (для владельца).
export async function listStaff(organizationId: string) {
  return db()
    .select({
      userId: appUser.id,
      name: appUser.name,
      phone: appUser.phone,
      role: membership.role,
      status: membership.status,
    })
    .from(membership)
    .innerJoin(appUser, eq(appUser.id, membership.userId))
    .where(eq(membership.organizationId, organizationId))
}
