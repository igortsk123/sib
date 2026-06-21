import { readFileSync } from "node:fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"
import { attachment, emailMessage, guaranteeLetter, insuranceCompany } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Сид демо-реестра из корпуса. Читает датасет (extract_dataset.py), оригиналы
// уже разложены в STORAGE_DIR (emails/, attachments/). Идемпотентно: чистит
// прежние демо-записи (реальных данных нет) и вставляет заново. Поля — детерминированные;
// LLM-обогащение — отдельным шагом при наличии ключа (ADR D10).
// ─────────────────────────────────────────────────────────────────────
type LetterRec = {
  rowIndex: number | null
  patientFullName: string | null
  patientBirthDate?: string | null
  policyNumber: string | null
  letterNumber: string | null
  caseNumber?: string | null
  approvalStatus: string
  letterDate: string | null
  validUntil?: string | null
  amountLimit?: string | null
  services: (string | null)[]
  source: string
  method?: string | null
  confidence?: Record<string, number>
  needsReview?: boolean
  reviewNote?: string | null
}
type AttRec = { attId: string; filename: string | null; ext: string; size: number; sha256: string }
type EmailRec = {
  emailId: string
  insurer: string
  insurerDomain: string
  mailbox: string
  receivedAt: string | null
  rawSha256: string
  attachments: AttRec[]
  letters: LetterRec[]
}

const VALID_STATUS = new Set(["approved", "denied", "partial", "need_info", "need_approval", "unknown"])

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[corpus] DATABASE_URL не задан")
    process.exit(1)
  }
  const datasetPath = process.env.DATASET_PATH || "/app/storage/_seed/dataset.json"
  const dataset = JSON.parse(readFileSync(datasetPath, "utf-8")) as EmailRec[]

  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })
  try {
    // карта страховых name→id
    const insurers = await db.select({ id: insuranceCompany.id, name: insuranceCompany.name }).from(insuranceCompany)
    const insurerByName = new Map(insurers.map((i) => [i.name, i.id]))

    // очистка демо-данных (реальных нет)
    await db.delete(guaranteeLetter)
    await db.delete(attachment)
    await db.delete(emailMessage)

    let emails = 0
    let letters = 0
    for (const e of dataset) {
      const insurerId = insurerByName.get(e.insurer) ?? null
      const [em] = await db
        .insert(emailMessage)
        .values({
          mailbox: e.mailbox,
          receivedAt: e.receivedAt ? new Date(e.receivedAt) : null,
          isForwarded: true,
          rawStoragePath: `emails/${e.emailId}.eml`,
          rawSha256: e.rawSha256,
          insuranceCompanyId: insurerId,
          status: "parsed",
        })
        .returning({ id: emailMessage.id })
      emails++

      const attIdMap = new Map<string, string>()
      for (const a of e.attachments) {
        const [att] = await db
          .insert(attachment)
          .values({
            emailMessageId: em.id,
            filename: a.filename,
            ext: a.ext,
            size: a.size,
            sha256: a.sha256,
            storagePath: `attachments/${a.attId}.${a.ext}`,
            isExtracted: true,
          })
          .returning({ id: attachment.id })
        attIdMap.set(a.attId, att.id)
      }
      const firstAttId = e.attachments[0] ? attIdMap.get(e.attachments[0].attId) : null

      for (const l of e.letters) {
        await db.insert(guaranteeLetter).values({
          emailMessageId: em.id,
          attachmentId: l.source !== "body" ? firstAttId ?? null : null,
          insuranceCompanyId: insurerId,
          rowIndex: l.rowIndex,
          patientFullName: l.patientFullName,
          patientBirthDate: l.patientBirthDate ?? null,
          policyNumber: l.policyNumber,
          letterNumber: l.letterNumber,
          caseNumber: l.caseNumber ?? null,
          approvalStatus: (VALID_STATUS.has(l.approvalStatus) ? l.approvalStatus : "unknown") as never,
          letterDate: l.letterDate,
          validUntil: l.validUntil ?? null,
          amountLimit: l.amountLimit ?? null,
          services: (l.services ?? []).filter(Boolean),
          source: l.source,
          method: l.method ?? null,
          confidence: l.confidence ?? {},
          needsReview: l.needsReview ?? false,
          reviewNote: l.reviewNote ?? null,
          reviewStatus: "auto",
        })
        letters++
      }
    }
    console.log(`[corpus] готово: писем ${emails}, записей ГП ${letters}`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[corpus] FAILED", e)
  process.exit(1)
})
