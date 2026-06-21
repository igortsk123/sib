"use server"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appUser, membership, organization } from "@/lib/db/schema"
import { requirePlatformAdmin } from "@/lib/server/auth/guards"
import { normalizePhone } from "@/lib/server/auth/phone"
import { err, ok, type Result } from "@/lib/result"
import { revalidatePath } from "next/cache"

// Платформенный админ: создать клинику. Опц. сразу назначить владельца по телефону.
export async function createClinic(input: {
  name: string
  ownerPhone?: string
  ownerName?: string
}): Promise<Result<{ organizationId: string }>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)

  const name = (input.name ?? "").trim()
  if (name.length < 2) return err("Введите название клиники")

  const [org] = await db().insert(organization).values({ name }).returning()

  if (input.ownerPhone) {
    const phone = normalizePhone(input.ownerPhone)
    if (!phone) return err("Некорректный телефон владельца")
    const user = await upsertUserByPhone(phone, input.ownerName)
    await db()
      .insert(membership)
      .values({ userId: user.id, organizationId: org.id, role: "owner", status: "active" })
      .onConflictDoNothing()
  }

  revalidatePath("/admin/clinics")
  return ok({ organizationId: org.id })
}

// Платформенный админ: назначить/добавить владельца существующей клинике.
export async function addClinicOwner(input: {
  organizationId: string
  phone: string
  name?: string
}): Promise<Result<{ userId: string }>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const phone = normalizePhone(input.phone)
  if (!phone) return err("Некорректный телефон")
  const user = await upsertUserByPhone(phone, input.name)
  await db()
    .insert(membership)
    .values({ userId: user.id, organizationId: input.organizationId, role: "owner", status: "active" })
    .onConflictDoUpdate({
      target: [membership.userId, membership.organizationId],
      set: { role: "owner", status: "active" },
    })
  revalidatePath("/admin/clinics")
  return ok({ userId: user.id })
}

async function upsertUserByPhone(phone: string, name?: string) {
  const existing = await db().select().from(appUser).where(eq(appUser.phone, phone)).limit(1)
  if (existing[0]) {
    if (name && !existing[0].name) {
      await db().update(appUser).set({ name }).where(eq(appUser.id, existing[0].id))
    }
    return existing[0]
  }
  const [created] = await db().insert(appUser).values({ phone, name }).returning()
  return created
}
