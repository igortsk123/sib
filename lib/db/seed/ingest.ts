import { readFileSync } from "node:fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { eq, inArray, sql } from "drizzle-orm"

import * as schema from "@/lib/db/schema"
import { attachment, docTemplate, emailMessage, errorReport, guaranteeLetter, insuranceCompany, organization, parseLog } from "@/lib/db/schema"
import { classifyCareType } from "@/lib/care-type"
import {
  type Dataset,
  VALID_CARETYPE, VALID_DOCTYPE, VALID_STATUS,
  safeDate, str, titleCaseFio,
} from "./shared"

// ─────────────────────────────────────────────────────────────────────
// Живой приём (S1): инкрементальный UPSERT дельты новых писем в реестр — БЕЗ wipe.
// Идемпотентно по rawSha256 письма (уже принятое письмо пропускаем). Файлы (.eml/вложения)
// раскладывает раннер до вызова (в STORAGE_DIR), здесь только пишем записи в БД.
// Self-healing: письмо с известного домена, но НОВОГО типа/шаблона → запись всё равно в реестре,
// шаблон авто-создаётся (status "new"), запись помечается needsReview, админу — алерт (error_report).
// Общие нормализаторы полей — shared.ts (тот же код, что batch-сид corpus.ts).
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("[ingest] DATABASE_URL не задан")
    process.exit(1)
  }
  const datasetPath = process.env.DATASET_PATH || "/app/storage/_intake/dataset.json"
  const data = JSON.parse(readFileSync(datasetPath, "utf-8")) as Dataset

  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })
  const summary = { newEmails: 0, skipped: 0, newLetters: 0, newTemplates: 0, needsReview: 0, alerts: 0 }
  try {
    const insurers = await db
      .select({ id: insuranceCompany.id, name: insuranceCompany.name, aliases: insuranceCompany.aliases })
      .from(insuranceCompany)
    const insurerByName = new Map<string, string>()
    const idToName = new Map<string, string>()
    for (const i of insurers) {
      insurerByName.set(i.name, i.id)
      idToName.set(i.id, i.name)
      for (const a of i.aliases ?? []) if (!insurerByName.has(a)) insurerByName.set(a, i.id)
    }
    const officialName = (short?: string | null) => {
      if (!short) return null
      const id = insurerByName.get(short)
      return (id && idToName.get(id)) || short
    }

    const orgName = process.env.CORPUS_ORG_NAME || "Клиника Сибирская"
    let orgRows = await db.select({ id: organization.id }).from(organization).where(eq(organization.name, orgName)).limit(1)
    if (!orgRows[0]) {
      orgRows = await db.insert(organization).values({ name: orgName }).returning({ id: organization.id })
    }
    const orgId = orgRows[0].id

    // Дедуп: какие письма (по rawSha256) уже в базе — их пропускаем целиком.
    const incomingSha = data.emails.map((e) => e.rawSha256).filter(Boolean)
    const existingSha = new Set<string>()
    if (incomingSha.length) {
      const rows = await db
        .select({ sha: emailMessage.rawSha256 })
        .from(emailMessage)
        .where(inArray(emailMessage.rawSha256, incomingSha))
      for (const r of rows) if (r.sha) existingSha.add(r.sha)
    }

    // Какие пары (insurerId::docType) уже имеют шаблон — новые считаем self-healing.
    const existingTpl = new Set<string>()
    const tplRows = await db.select({ ic: docTemplate.insuranceCompanyId, dt: docTemplate.docType }).from(docTemplate)
    for (const t of tplRows) existingTpl.add(`${t.ic}::${t.dt}`)

    // Вставка новых писем + вложений.
    const emailMap = new Map<string, string>()
    const attMap = new Map<string, string>()
    for (const e of data.emails) {
      if (existingSha.has(e.rawSha256)) { summary.skipped++; continue }
      const [em] = await db
        .insert(emailMessage)
        .values({
          organizationId: orgId,
          mailbox: e.mailbox,
          receivedAt: e.receivedAt ? new Date(e.receivedAt) : null,
          isForwarded: false, // прямой приём (не пересылка)
          rawStoragePath: `emails/${e.emailId}.eml`,
          rawSha256: e.rawSha256,
          insuranceCompanyId: insurerByName.get(e.insurer) ?? null,
          status: "parsed",
          docType: e.isCompanion ? "archive_password" : "guarantee",
        })
        .returning({ id: emailMessage.id })
      emailMap.set(e.emailId, em.id)
      summary.newEmails++
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

    // Представитель шаблона (тема/тело/файл) для новых пар insurer::docType.
    const attInfo = new Map<string, { ext: string; filename: string | null }>()
    for (const e of data.emails) for (const a of e.attachments) attInfo.set(a.attId, { ext: a.ext, filename: a.filename })
    const emailSubject = new Map<string, string | null>()
    const emailBody = new Map<string, string | null>()
    for (const e of data.emails) {
      emailSubject.set(e.emailId, e.subject ?? null)
      emailBody.set(e.emailId, e.bodyRaw ?? null)
    }
    const tplRep = new Map<string, { subject: string | null; text: string | null; storagePath: string | null; filename: string | null }>()
    const newTplKeys = new Set<string>() // пары, шаблона которых ещё не было → self-healing
    const firstLetterOfTpl = new Map<string, string>() // key → id первой записи (для алерта)

    // Вставка записей ГП (только для новых писем) + журнал разбора + определение self-healing.
    const plByKey = new Map<string, Record<string, unknown>>()
    try {
      const logPath = datasetPath.replace(/dataset\.json$/, "parse_log.jsonl")
      for (const l of readFileSync(logPath, "utf-8").split("\n").filter((x) => x.trim())) {
        const r = JSON.parse(l) as Record<string, unknown>
        plByKey.set(`${r.emailId}|${r.rowIndex ?? ""}`, r)
      }
    } catch { /* журнала может не быть */ }

    for (const l of data.letters) {
      const emId = emailMap.get(l.emailId)
      if (!emId) continue // письмо пропущено (дубль) → запись не создаём
      const sourceIds = (l.sourceEmailIds ?? []).map((x) => emailMap.get(x)).filter((x): x is string => Boolean(x))
      const firstAtt = (l.attIds ?? []).map((x) => attMap.get(x)).find(Boolean) ?? null
      const insurerId = insurerByName.get(data.emails.find((e) => e.emailId === l.emailId)?.insurer ?? "") ?? null
      const dt = l.docType && VALID_DOCTYPE.has(l.docType) ? l.docType : null
      const tplKey = insurerId && dt ? `${insurerId}::${dt}` : null
      const isNewTpl = tplKey ? !existingTpl.has(tplKey) : false
      if (isNewTpl && tplKey) {
        newTplKeys.add(tplKey)
        if (!tplRep.has(tplKey)) {
          const att0 = (l.attIds ?? [])[0]
          const info = att0 ? attInfo.get(att0) : undefined
          tplRep.set(tplKey, {
            subject: emailSubject.get(l.emailId) ?? null,
            text: emailBody.get(l.emailId) || null,
            storagePath: info ? `attachments/${att0}.${info.ext}` : null,
            filename: info?.filename ?? null,
          })
        }
      }
      // self-healing: новый шаблон → форсим ручную проверку записи.
      const forcedReview = isNewTpl
      const willReview = (l.needsReview ?? false) || forcedReview
      const [ins] = await db.insert(guaranteeLetter).values({
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
        docType: (dt) as never,
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
        needsReview: willReview,
        reviewNote: forcedReview ? "Новый тип документа — авто-распознан, проверьте поля" : (l.reviewNote ?? null),
        reviewStatus: "auto",
      }).returning({ id: guaranteeLetter.id })
      summary.newLetters++
      if (willReview) summary.needsReview++
      if (tplKey && isNewTpl && !firstLetterOfTpl.has(tplKey)) firstLetterOfTpl.set(tplKey, ins.id)

      // Журнал разбора для этой записи.
      const r = plByKey.get(`${l.emailId}|${l.rowIndex ?? ""}`)
      if (r) {
        await db.insert(parseLog).values({
          insurer: officialName(r.insurer as string),
          docType: (r.docType as string) ?? dt ?? null,
          source: (r.source as string) ?? null,
          method: (r.method as string) ?? null,
          rowIndex: (r.rowIndex as number) ?? null,
          missing: (r.missing as string[]) ?? [],
          detGap: (r.detGap as string[]) ?? [],
          llmFilled: (r.llmFilled as string[]) ?? [],
        })
      }
    }

    // Авто-создание новых шаблонов (self-healing) + алерт админу.
    for (const key of newTplKeys) {
      const [insuranceCompanyId, docType] = key.split("::")
      const rep = tplRep.get(key)
      await db
        .insert(docTemplate)
        .values({
          insuranceCompanyId,
          docType: docType as never,
          status: "new", // авто-создан приёмом, эталон/парсер ещё не настроены
          note: "Авто-создан живым приёмом (self-healing) — новый тип от известной страховой",
          sampleSubject: rep?.subject ?? null,
          sampleText: rep?.text ?? null,
          sampleStoragePath: rep?.storagePath ?? null,
          sampleFilename: rep?.filename ?? null,
        })
        .onConflictDoNothing({ target: [docTemplate.insuranceCompanyId, docTemplate.docType] })
      summary.newTemplates++
      // Алерт: error_report на первой записи нового шаблона (админ увидит в /error-reports).
      const letterId = firstLetterOfTpl.get(key)
      if (letterId) {
        await db.insert(errorReport).values({
          letterId,
          message: `Self-healing: новый тип документа «${docType}» от «${idToName.get(insuranceCompanyId) ?? insuranceCompanyId}» — авто-создан шаблон, распознано LLM. Проверьте разбор и настройте шаблон.`,
          status: "open",
        })
        summary.alerts++
      }
    }

    console.log(`[ingest] ${JSON.stringify(summary)}`)
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error("[ingest] FAILED", e)
  process.exit(1)
})
