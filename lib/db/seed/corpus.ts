import { readFileSync } from "node:fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { eq, sql } from "drizzle-orm"

import * as schema from "@/lib/db/schema"
import { attachment, docTemplate, emailMessage, guaranteeLetter, insuranceCompany, organization, parseLog } from "@/lib/db/schema"
import { classifyCareType } from "@/lib/care-type"
import {
  type Dataset,
  VALID_CARETYPE, VALID_DOCTYPE, VALID_STATUS,
  safeDate, str, titleCaseFio,
} from "./shared"

// ─────────────────────────────────────────────────────────────────────
// Сид демо-реестра из корпуса. Структура датасета: { emails, letters }.
// emails — ВСЕ письма (вкл. письма-пароли, isCompanion); letters — записи ГП
// (письма-пароли НЕ записи, но входят в sourceEmailIds для единой ссылки сверки).
// Идемпотентно: чистит прежние демо-данные. LLM-поля из enrich (ADR D12/D13).
// Инкрементальный (append) аналог для живого приёма — ingest.ts (общие хелперы в shared.ts).
// ─────────────────────────────────────────────────────────────────────

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
        const plRows = rows.map((r) => ({
          insurer: officialName(r.insurer as string), // официальное имя (журнал ищет по нему)
          docType: (r.docType as string) ?? dtByKey.get(`${r.emailId}|${r.rowIndex ?? ""}`) ?? null,
          source: (r.source as string) ?? null,
          method: (r.method as string) ?? null,
          rowIndex: (r.rowIndex as number) ?? null,
          missing: (r.missing as string[]) ?? [],
          detGap: (r.detGap as string[]) ?? [],
          llmFilled: (r.llmFilled as string[]) ?? [],
        }))
        // Чанки: 9 колонок × >7000 строк превысят лимит параметров Postgres (65535). Вставляем пачками.
        const CHUNK = 1000
        for (let i = 0; i < plRows.length; i += CHUNK) {
          await db.insert(parseLog).values(plRows.slice(i, i + CHUNK))
        }
        console.log(`[corpus] parse_log: ${plRows.length} записей`)
      }
    } catch (e) {
      console.log(`[corpus] parse_log пропущен: ${(e as Error).message ?? e}`)
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
    // emailId → тема и ДОСЛОВНОЕ тело письма (для образца шаблона — «как было»)
    const emailSubject = new Map<string, string | null>()
    const emailBody = new Map<string, string | null>()
    for (const e of data.emails) {
      emailSubject.set(e.emailId, (e as { subject?: string | null }).subject ?? null)
      emailBody.set(e.emailId, (e as { bodyRaw?: string | null }).bodyRaw ?? null)
    }
    // «insurerId::docType» → представитель (тема + тело + файл) для предзаполнения шаблона (что гнать через LLM).
    const tplRep = new Map<string, { subject: string | null; text: string | null; storagePath: string | null; filename: string | null }>()
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
        const body = emailBody.get(l.emailId) || null
        if (!cur || (!cur.text && body)) {
          const att0 = (l.attIds ?? [])[0]
          const info = att0 ? attInfo.get(att0) : undefined
          tplRep.set(key, {
            subject: emailSubject.get(l.emailId) ?? null,
            text: body, // ДОСЛОВНОЕ тело письма (без префикса/вложений)
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
        policyNumber: str(l.policyNumber),
        letterNumber: str(l.letterNumber),
        caseNumber: str(l.caseNumber),
        contractNumber: str(l.contractNumber),
        docType: (l.docType && VALID_DOCTYPE.has(l.docType) ? l.docType : null) as never,
        careType: ((VALID_CARETYPE.has(l.careType as string) ? (l.careType as string) : null) || classifyCareType(l.services, l.text)) as never,
        approvalStatus: (VALID_STATUS.has(l.approvalStatus) ? l.approvalStatus : "unknown") as never,
        letterDate: safeDate(l.letterDate),
        coverageFrom: safeDate(l.coverageFrom),
        coverageTo: safeDate(l.coverageTo),
        validUntil: safeDate(l.validUntil),
        amountLimit: str(l.amountLimit),
        conditions: str(l.conditions),
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
          sampleSubject: rep.subject,
          sampleText: rep.text,
          sampleStoragePath: rep.storagePath,
          sampleFilename: rep.filename,
        })
        .onConflictDoUpdate({
          // Авто-образец из корпуса — перезаписываем (excluded.*), чтобы применить дословное тело.
          // TODO(prod): не затирать вручную отредактированный образец (нужен флаг sample_manual).
          target: [docTemplate.insuranceCompanyId, docTemplate.docType],
          set: {
            sampleSubject: sql`excluded.sample_subject`,
            sampleText: sql`excluded.sample_text`,
            sampleStoragePath: sql`excluded.sample_storage_path`,
            sampleFilename: sql`excluded.sample_filename`,
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
