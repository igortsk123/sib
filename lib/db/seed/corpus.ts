import { readFileSync } from "node:fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { eq, sql } from "drizzle-orm"

import * as schema from "@/lib/db/schema"
import { attachment, docTemplate, emailMessage, guaranteeLetter, insuranceCompany, organization, parseLog } from "@/lib/db/schema"
import { classifyCareType } from "@/lib/care-type"

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
  contractNumber?: string | null
  docType?: string | null
  careType?: string | null
  text?: string | null
  approvalStatus: string
  letterDate: string | null
  coverageFrom?: string | null
  coverageTo?: string | null
  validUntil?: string | null
  amountLimit?: string | null
  conditions?: string | null
  services: (string | null)[]
  source: string
  method?: string | null
  confidence?: Record<string, number>
  needsReview?: boolean
  reviewNote?: string | null
}
type Dataset = { emails: EmailRec[]; letters: LetterRec[] }

const VALID_STATUS = new Set([
  "approved", "denied", "detach", "enroll", "annul", "partial", "need_info", "need_approval", "unknown",
])
const VALID_DOCTYPE = new Set([
  "guarantee", "enroll", "detach", "annul", "referral", "denial", "info_request", "archive_password", "service", "other",
])

// ФИО к виду «Фамилия Имя Отчество» (нормализуем только полностью ВЕРХНИЙ регистр).
function titleCaseFio(s: string | null): string | null {
  if (!s) return s
  const t = s.trim()
  if (t !== t.toUpperCase()) return t
  return t.toLowerCase().replace(/(^|[\s\-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

// Дата: принимаем только YYYY-MM-DD; DD.MM.YYYY конвертируем; Excel-серийные/прочее → null
// (защита от падения seed на «35234.0» из бинарного .xls).
function safeDate(v: string | null | undefined): string | null {
  if (!v) return null
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = /^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
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
    // матчим по name И aliases — датасет несёт короткие имена («Росгосстрах»), а name теперь официальное.
    const insurers = await db
      .select({ id: insuranceCompany.id, name: insuranceCompany.name, aliases: insuranceCompany.aliases })
      .from(insuranceCompany)
    const insurerByName = new Map<string, string>()
    const idToName = new Map<string, string>() // id → ОФИЦИАЛЬНОЕ имя (для parse_log: журнал ищет по нему)
    for (const i of insurers) {
      insurerByName.set(i.name, i.id)
      idToName.set(i.id, i.name)
      for (const a of i.aliases ?? []) if (!insurerByName.has(a)) insurerByName.set(a, i.id)
    }
    // короткое имя (из jsonl/датасета) → официальное имя страховой
    const officialName = (short?: string | null) => {
      if (!short) return null
      const id = insurerByName.get(short)
      return (id && idToName.get(id)) || short
    }

    // Привязка корпуса к клинике (домен писем — cl-sib.ru). Найти/создать.
    const orgName = process.env.CORPUS_ORG_NAME || "Клиника Сибирская"
    let orgRows = await db.select({ id: organization.id }).from(organization).where(eq(organization.name, orgName)).limit(1)
    if (!orgRows[0]) {
      orgRows = await db.insert(organization).values({ name: orgName }).returning({ id: organization.id })
    }
    const orgId = orgRows[0].id

    await db.delete(guaranteeLetter)
    await db.delete(attachment)
    await db.delete(emailMessage)

    // Журнал разбора (parse_log.jsonl рядом с dataset.json) → таблица parse_log для админки.
    await db.delete(parseLog)
    try {
      const logPath = datasetPath.replace(/dataset\.json$/, "parse_log.jsonl")
      const lines = readFileSync(logPath, "utf-8").split("\n").filter((l) => l.trim())
      const rows = lines.map((l) => JSON.parse(l) as Record<string, unknown>)
      // docType по (emailId|rowIndex) из датасета — для счётчика дрейфа по типу в админке шаблонов.
      const dtByKey = new Map<string, string>()
      for (const l of data.letters) {
        dtByKey.set(`${l.emailId}|${l.rowIndex ?? ""}`, (l.docType as string) ?? (l.approvalStatus ?? ""))
      }
      if (rows.length) {
        await db.insert(parseLog).values(
          rows.map((r) => ({
            insurer: officialName(r.insurer as string), // официальное имя (журнал ищет по нему)
            docType: (r.docType as string) ?? dtByKey.get(`${r.emailId}|${r.rowIndex ?? ""}`) ?? null,
            source: (r.source as string) ?? null,
            method: (r.method as string) ?? null,
            rowIndex: (r.rowIndex as number) ?? null,
            missing: (r.missing as string[]) ?? [],
            detGap: (r.detGap as string[]) ?? [],
            llmFilled: (r.llmFilled as string[]) ?? [],
          })),
        )
        console.log(`[corpus] parse_log: ${rows.length} записей`)
      }
    } catch {
      console.log("[corpus] parse_log.jsonl не найден — пропуск")
    }

    const emailMap = new Map<string, string>() // dataset emailId → db uuid
    const attMap = new Map<string, string>()
    for (const e of data.emails) {
      const [em] = await db
        .insert(emailMessage)
        .values({
          organizationId: orgId,
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
    // attId → {ext, filename} для привязки файла-образца к шаблону.
    const attInfo = new Map<string, { ext: string; filename: string | null }>()
    for (const e of data.emails) for (const a of e.attachments) attInfo.set(a.attId, { ext: a.ext, filename: a.filename })
    // «insurerId::docType» → представитель (текст + файл) для предзаполнения шаблона (что гнать через LLM).
    const tplRep = new Map<string, { text: string | null; storagePath: string | null; filename: string | null }>()
    for (const l of data.letters) {
      const emId = emailMap.get(l.emailId)
      if (!emId) continue
      const sourceIds = (l.sourceEmailIds ?? [])
        .map((x) => emailMap.get(x))
        .filter((x): x is string => Boolean(x))
      const firstAtt = (l.attIds ?? []).map((x) => attMap.get(x)).find(Boolean) ?? null
      const insurerId = insurerByName.get(data.emails.find((e) => e.emailId === l.emailId)?.insurer ?? "") ?? null
      const dt = l.docType && VALID_DOCTYPE.has(l.docType) ? l.docType : null
      if (insurerId && dt) {
        const key = `${insurerId}::${dt}`
        const cur = tplRep.get(key)
        if (!cur || (!cur.text && l.text)) {
          const att0 = (l.attIds ?? [])[0]
          const info = att0 ? attInfo.get(att0) : undefined
          tplRep.set(key, {
            text: (l.text as string) || null,
            storagePath: info ? `attachments/${att0}.${info.ext}` : null,
            filename: info?.filename ?? null,
          })
        }
      }
      await db.insert(guaranteeLetter).values({
        organizationId: orgId,
        emailMessageId: emId,
        sourceEmailIds: sourceIds,
        attachmentId: firstAtt,
        insuranceCompanyId: insurerId,
        rowIndex: l.rowIndex,
        patientFullName: titleCaseFio(l.patientFullName),
        patientBirthDate: safeDate(l.patientBirthDate),
        policyNumber: l.policyNumber,
        letterNumber: l.letterNumber,
        caseNumber: l.caseNumber ?? null,
        contractNumber: l.contractNumber ?? null,
        docType: (l.docType && VALID_DOCTYPE.has(l.docType) ? l.docType : null) as never,
        careType: ((l.careType as string) || classifyCareType(l.services, l.text)) as never,
        approvalStatus: (VALID_STATUS.has(l.approvalStatus) ? l.approvalStatus : "unknown") as never,
        letterDate: safeDate(l.letterDate),
        coverageFrom: safeDate(l.coverageFrom),
        coverageTo: safeDate(l.coverageTo),
        validUntil: safeDate(l.validUntil),
        amountLimit: l.amountLimit ?? null,
        conditions: l.conditions ?? null,
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

    // Предзаполнение шаблонов: у каждой страховой — её типы документов (по факту корпуса) + ФАЙЛ-ОБРАЗЕЦ
    // (текст + вложение из представителя), чтобы было что прогнать через LLM. Идемпотентно (unique
    // insurer+docType); образец дозаполняем через coalesce — НЕ затираем вручную загруженный.
    for (const [key, rep] of tplRep) {
      const [insuranceCompanyId, docType] = key.split("::")
      await db
        .insert(docTemplate)
        .values({
          insuranceCompanyId,
          docType: docType as never,
          status: "parser_ready",
          sampleText: rep.text,
          sampleStoragePath: rep.storagePath,
          sampleFilename: rep.filename,
        })
        .onConflictDoUpdate({
          target: [docTemplate.insuranceCompanyId, docTemplate.docType],
          set: {
            sampleText: sql`coalesce(${docTemplate.sampleText}, excluded.sample_text)`,
            sampleStoragePath: sql`coalesce(${docTemplate.sampleStoragePath}, excluded.sample_storage_path)`,
            sampleFilename: sql`coalesce(${docTemplate.sampleFilename}, excluded.sample_filename)`,
          },
        })
    }
    console.log(`[corpus] шаблоны типов: ${tplRep.size} (с файлом-образцом)`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[corpus] FAILED", e)
  process.exit(1)
})
