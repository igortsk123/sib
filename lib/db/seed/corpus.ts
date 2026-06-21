import { readFileSync } from "node:fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"
import { attachment, emailMessage, guaranteeLetter, insuranceCompany } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Сид демо-реестра из корпуса. Структура датасета: { emails, letters }.
// emails — ВСЕ письма (вкл. письма-пароли, isCompanion); letters — записи ГП
// (письма-пароли НЕ записи, но входят в sourceEmailIds для единой ссылки сверки).
// Идемпотентно: чистит прежние демо-данные. LLM-поля из enrich (ADR D12/D13).
// ─────────────────────────────────────────────────────────────────────
type AttRec = { attId: string; filename: string | null; ext: string; size: number; sha256: string }
type EmailRec = {
  emailId: string
  insurer: string
  mailbox: string
  receivedAt: string | null
  rawSha256: string
  isCompanion: boolean
  attachments: AttRec[]
}
type LetterRec = {
  emailId: string
  sourceEmailIds: string[]
  attIds: string[]
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
type Dataset = { emails: EmailRec[]; letters: LetterRec[] }

const VALID_STATUS = new Set(["approved", "denied", "partial", "need_info", "need_approval", "unknown"])

// ФИО к виду «Фамилия Имя Отчество» (нормализуем только полностью ВЕРХНИЙ регистр).
function titleCaseFio(s: string | null): string | null {
  if (!s) return s
  const t = s.trim()
  if (t !== t.toUpperCase()) return t
  return t.toLowerCase().replace(/(^|[\s\-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[corpus] DATABASE_URL не задан")
    process.exit(1)
  }
  const datasetPath = process.env.DATASET_PATH || "/app/storage/_seed/dataset.json"
  const data = JSON.parse(readFileSync(datasetPath, "utf-8")) as Dataset

  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })
  try {
    const insurers = await db.select({ id: insuranceCompany.id, name: insuranceCompany.name }).from(insuranceCompany)
    const insurerByName = new Map(insurers.map((i) => [i.name, i.id]))

    await db.delete(guaranteeLetter)
    await db.delete(attachment)
    await db.delete(emailMessage)

    const emailMap = new Map<string, string>() // dataset emailId → db uuid
    const attMap = new Map<string, string>()
    for (const e of data.emails) {
      const [em] = await db
        .insert(emailMessage)
        .values({
          mailbox: e.mailbox,
          receivedAt: e.receivedAt ? new Date(e.receivedAt) : null,
          isForwarded: true,
          rawStoragePath: `emails/${e.emailId}.eml`,
          rawSha256: e.rawSha256,
          insuranceCompanyId: insurerByName.get(e.insurer) ?? null,
          status: "parsed",
          docType: e.isCompanion ? "archive_password" : "guarantee",
        })
        .returning({ id: emailMessage.id })
      emailMap.set(e.emailId, em.id)
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
        attMap.set(a.attId, att.id)
      }
    }

    let n = 0
    for (const l of data.letters) {
      const emId = emailMap.get(l.emailId)
      if (!emId) continue
      const sourceIds = (l.sourceEmailIds ?? [])
        .map((x) => emailMap.get(x))
        .filter((x): x is string => Boolean(x))
      const firstAtt = (l.attIds ?? []).map((x) => attMap.get(x)).find(Boolean) ?? null
      await db.insert(guaranteeLetter).values({
        emailMessageId: emId,
        sourceEmailIds: sourceIds,
        attachmentId: firstAtt,
        insuranceCompanyId: insurerByName.get(data.emails.find((e) => e.emailId === l.emailId)?.insurer ?? "") ?? null,
        rowIndex: l.rowIndex,
        patientFullName: titleCaseFio(l.patientFullName),
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
      n++
    }
    console.log(`[corpus] готово: писем ${data.emails.length}, записей ГП ${n}`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[corpus] FAILED", e)
  process.exit(1)
})
