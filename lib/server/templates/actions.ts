"use server"

import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { docTemplate } from "@/lib/db/schema"
import { requirePlatformAdmin } from "@/lib/server/auth/guards"
import { chatComplete } from "@/lib/server/llm/openai"
import { GOLD_MODEL, GOLD_SYSTEM, goldUserMessage } from "@/lib/server/templates/prompt"
import { STORAGE_DIR } from "@/lib/storage"
import { err, ok, type Result } from "@/lib/result"

const DOC_TYPES = new Set([
  "guarantee", "enroll", "detach", "annul", "referral", "denial", "info_request", "service", "other",
])

// Добавить тип документа (шаблон) страховой: образец в защищённое хранилище + опц. текст образца.
export async function addDocTemplate(form: FormData): Promise<Result<{ id: string }>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const insurerId = String(form.get("insurerId") || "")
  const docType = String(form.get("docType") || "")
  const subject = (String(form.get("subject") || "").trim()) || null
  const text = (String(form.get("text") || "").trim()) || null
  if (!insurerId) return err("Не указана страховая")
  if (!DOC_TYPES.has(docType)) return err("Выберите тип документа")

  const file = form.get("file")
  let storagePath: string | null = null
  let filename: string | null = null
  if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
    const f = file as File
    const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")
    const rel = `templates/${randomUUID()}.${ext}`
    const dir = path.resolve(STORAGE_DIR, "templates")
    await mkdir(dir, { recursive: true })
    await writeFile(path.resolve(STORAGE_DIR, rel), Buffer.from(await f.arrayBuffer()))
    storagePath = rel
    filename = f.name
  }
  if (!storagePath && !text) return err("Загрузите образец или вставьте текст образца")

  try {
    const [row] = await db()
      .insert(docTemplate)
      .values({
        insuranceCompanyId: insurerId,
        docType: docType as never,
        sampleStoragePath: storagePath,
        sampleFilename: filename,
        sampleSubject: subject,
        sampleText: text,
        status: "new",
      })
      .returning({ id: docTemplate.id })
    revalidatePath(`/insurers/${insurerId}`)
    return ok({ id: row.id })
  } catch {
    return err("Такой тип документа у этой страховой уже заведён")
  }
}

// Извлечь ЭТАЛОН (gold JSON) через LLM-учителя (gpt-5.5) по тексту образца.
export async function extractGold(templateId: string): Promise<Result<null>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const rows = await db().select().from(docTemplate).where(eq(docTemplate.id, templateId)).limit(1)
  const tpl = rows[0]
  if (!tpl) return err("Шаблон не найден")
  if (!tpl.sampleText) {
    return err("Нет текста образца. Вставьте текст (авто-извлечение PDF/Excel — в S1).")
  }
  const res = await chatComplete(
    [
      { role: "system", content: GOLD_SYSTEM },
      { role: "user", content: goldUserMessage(tpl.sampleText, tpl.sampleSubject) },
    ],
    { model: GOLD_MODEL, jsonMode: true, timeoutMs: 90_000 },
  )
  if (!res.ok) return err(res.error)
  let gold: Record<string, unknown>
  try {
    gold = JSON.parse(res.value)
  } catch {
    return err("LLM вернул не-JSON")
  }
  await db()
    .update(docTemplate)
    .set({ goldJson: gold, status: "llm_parsed", updatedAt: new Date() })
    .where(eq(docTemplate.id, templateId))
  revalidatePath(`/insurers/${tpl.insuranceCompanyId}`)
  return ok(null)
}

export async function deleteDocTemplate(templateId: string): Promise<Result<null>> {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return err(auth.error)
  const rows = await db().select().from(docTemplate).where(eq(docTemplate.id, templateId)).limit(1)
  const tpl = rows[0]
  if (!tpl) return err("Шаблон не найден")
  await db().delete(docTemplate).where(eq(docTemplate.id, templateId))
  revalidatePath(`/insurers/${tpl.insuranceCompanyId}`)
  return ok(null)
}
