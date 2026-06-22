"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { errorReport } from "@/lib/db/schema"
import { requirePlatformAdmin, requireUser } from "@/lib/server/auth/guards"
import { notifyErrorFixed } from "@/lib/server/mail/notify"
import { err, ok, type Result } from "@/lib/result"

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Сообщить об ошибке в записи (любой вошедший пользователь, смотрящий карточку).
export async function reportError(input: {
  letterId: string
  message: string
}): Promise<Result<null>> {
  const auth = await requireUser()
  if (!auth.ok) return err(auth.error)
  const message = (input.message ?? "").trim()
  if (message.length < 3) return err("Опишите, в чём ошибка")
  // Email НЕ спрашиваем — берём из аккаунта пользователя (если указан). На него придёт уведомление об исправлении.
  const email = (auth.user.email ?? "").trim()
  await db().insert(errorReport).values({
    letterId: input.letterId,
    message: message.slice(0, 2000),
    reporterEmail: email && EMAIL_RE.test(email) ? email : null,
    reportedBy: auth.user.id,
  })
  revalidatePath(`/registry/${input.letterId}`)
  return ok(null)
}

// Разобрать репорт (платформенный админ): исправлено / отклонено. При «fixed» + указанной почте —
// уведомляем автора (письмо; пока логируется как pending до настройки SMTP).
export async function resolveReport(input: {
  id: string
  status: "fixed" | "dismissed"
  note?: string
}): Promise<Result<null>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const rows = await db().select().from(errorReport).where(eq(errorReport.id, input.id)).limit(1)
  const r = rows[0]
  if (!r) return err("Репорт не найден")
  let notifiedAt: Date | null = null
  if (input.status === "fixed" && r.reporterEmail) {
    const sent = await notifyErrorFixed(r.reporterEmail, r.letterId)
    notifiedAt = sent ? new Date() : null
  }
  await db()
    .update(errorReport)
    .set({
      status: input.status,
      resolutionNote: input.note ?? null,
      resolvedBy: auth.user.id,
      resolvedAt: new Date(),
      notifiedAt,
    })
    .where(eq(errorReport.id, input.id))
  revalidatePath("/error-reports")
  return ok(null)
}
