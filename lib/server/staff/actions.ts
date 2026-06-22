"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { appUser, membership } from "@/lib/db/schema"
import { requireClinicOwner } from "@/lib/server/auth/guards"
import { normalizePhone } from "@/lib/server/auth/phone"
import { err, ok, type Result } from "@/lib/result"

type StaffRole = "dms" | "doctor" | "registry" | "registry_senior"
const STAFF_ROLES: StaffRole[] = ["dms", "doctor", "registry", "registry_senior"]

// Владелец клиники: добавить сотрудника (телефон, имя, роль).
export async function addStaff(input: {
  organizationId: string
  phone: string
  name?: string
  email?: string
  role: StaffRole
}): Promise<Result<{ userId: string }>> {
  const auth = await requireClinicOwner(input.organizationId)
  if (!auth.ok) return err(auth.error)
  if (!STAFF_ROLES.includes(input.role)) return err("Недопустимая роль")
  const phone = normalizePhone(input.phone)
  if (!phone) return err("Некорректный телефон")
  const email = (input.email ?? "").trim() || null
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Некорректная почта")

  const existing = await db().select().from(appUser).where(eq(appUser.phone, phone)).limit(1)
  let user = existing[0]
  if (!user) {
    ;[user] = await db().insert(appUser).values({ phone, name: input.name, email }).returning()
  } else {
    const patch: { name?: string; email?: string } = {}
    if (input.name && !user.name) patch.name = input.name
    if (email && user.email !== email) patch.email = email
    if (Object.keys(patch).length) await db().update(appUser).set(patch).where(eq(appUser.id, user.id))
  }

  await db()
    .insert(membership)
    .values({ userId: user.id, organizationId: input.organizationId, role: input.role, status: "active" })
    .onConflictDoUpdate({
      target: [membership.userId, membership.organizationId],
      set: { role: input.role, status: "active" },
    })
  revalidatePath("/staff")
  return ok({ userId: user.id })
}

// Владелец клиники: заблокировать/разблокировать участие сотрудника.
export async function setStaffStatus(input: {
  organizationId: string
  userId: string
  status: "active" | "blocked"
}): Promise<Result<null>> {
  const auth = await requireClinicOwner(input.organizationId)
  if (!auth.ok) return err(auth.error)
  await db()
    .update(membership)
    .set({ status: input.status })
    .where(
      and(eq(membership.userId, input.userId), eq(membership.organizationId, input.organizationId)),
    )
  revalidatePath("/staff")
  return ok(null)
}
