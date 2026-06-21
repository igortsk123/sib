"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { insuranceCompany } from "@/lib/db/schema"
import { requirePlatformAdmin } from "@/lib/server/auth/guards"
import { err, ok, type Result } from "@/lib/result"

const DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/

function parseDomains(input?: string): string[] {
  return (input ?? "")
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => DOMAIN_RE.test(d))
}

// Платформенный админ: добавить страховую (имя + опц. домены).
export async function createInsurer(input: {
  name: string
  domains?: string
}): Promise<Result<{ id: string }>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const name = (input.name ?? "").trim()
  if (name.length < 2) return err("Введите название страховой")
  const domains = parseDomains(input.domains)
  try {
    const [row] = await db()
      .insert(insuranceCompany)
      .values({ name, domains, aliases: [name] })
      .returning({ id: insuranceCompany.id })
    revalidatePath("/insurers")
    return ok({ id: row.id })
  } catch {
    return err("Страховая с таким названием уже есть")
  }
}

// Добавить домен страховой (для идентификации писем).
export async function addInsurerDomain(input: { id: string; domain: string }): Promise<Result<null>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const domain = input.domain.trim().toLowerCase()
  if (!DOMAIN_RE.test(domain)) return err("Некорректный домен (например, sogaz.ru)")
  const rows = await db().select().from(insuranceCompany).where(eq(insuranceCompany.id, input.id)).limit(1)
  const company = rows[0]
  if (!company) return err("Страховая не найдена")
  if (company.domains.includes(domain)) return err("Такой домен уже есть")
  await db()
    .update(insuranceCompany)
    .set({ domains: [...company.domains, domain], updatedAt: new Date() })
    .where(eq(insuranceCompany.id, input.id))
  revalidatePath("/insurers")
  return ok(null)
}

export async function removeInsurerDomain(input: { id: string; domain: string }): Promise<Result<null>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const rows = await db().select().from(insuranceCompany).where(eq(insuranceCompany.id, input.id)).limit(1)
  const company = rows[0]
  if (!company) return err("Страховая не найдена")
  await db()
    .update(insuranceCompany)
    .set({ domains: company.domains.filter((d) => d !== input.domain), updatedAt: new Date() })
    .where(eq(insuranceCompany.id, input.id))
  revalidatePath("/insurers")
  return ok(null)
}
