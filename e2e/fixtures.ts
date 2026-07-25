import { randomUUID } from "node:crypto"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Фикстуры e2e: минимальный вертикальный набор БЕЗ реальных ПДн — вымышленный пациент,
// одна страховая, программа с правилами и действующее гарантийное письмо.
// Идемпотентно: повторный прогон не плодит дублей (стабильные значения + onConflictDoNothing).
// Запуск: tsx e2e/fixtures.ts (вызывается из playwright globalSetup).
// ─────────────────────────────────────────────────────────────────────

const PATIENT = { fullName: "Тестов Пациент Игоревич", birthDate: "1990-04-15" }
const ORG = "Тестовая клиника (e2e)"
const TEST_PHONE = process.env.TEST_LOGIN_PHONE ?? "+79998887777"
const INSURER = "Тестовая страховая (e2e)"
const PROGRAM = "Тестовая стоматология (e2e)"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL не задан")
  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })

  // организация + тест-пользователь с членством: вход тест-логином найдёт существующего
  // пользователя, а скоуп клиники покажет фикстурные письма.
  const orgRows = await db.select({ id: schema.organization.id }).from(schema.organization)
  const orgId = orgRows[0]?.id ?? (await db.insert(schema.organization).values({ name: ORG }).returning())[0].id
  const userRows = await db.select({ id: schema.appUser.id }).from(schema.appUser)
  const userId = userRows[0]?.id ?? (await db.insert(schema.appUser).values({ phone: TEST_PHONE }).returning())[0].id
  await db.insert(schema.membership)
    .values({ organizationId: orgId, userId, role: "registry", status: "active" })
    .onConflictDoNothing()

  // страховая
  const [ic] = await db
    .insert(schema.insuranceCompany)
    .values({ name: INSURER, aliases: [], domains: ["e2e.example"], typicalEmails: [], rules: {} })
    .onConflictDoNothing()
    .returning()
  const insurerId =
    ic?.id ??
    (await db.select({ id: schema.insuranceCompany.id }).from(schema.insuranceCompany)).find(() => true)!.id

  // документ условий + правила программы
  const existingDoc = await db.select({ id: schema.programDocument.id }).from(schema.programDocument)
  let docId = existingDoc[0]?.id
  if (!docId) {
    const [doc] = await db
      .insert(schema.programDocument)
      .values({
        insuranceCompanyId: insurerId,
        title: "Тестовые правила ДМС (e2e)",
        docKind: "rules",
        sourceUrl: "https://e2e.example/rules",
        appliesTo: "all",
      })
      .returning()
    docId = doc.id
    await db.insert(schema.coverageRule).values([
      {
        documentId: docId, insuranceCompanyId: insurerId, programName: PROGRAM,
        serviceClass: "стоматология-хирургия", servicePattern: "удаление зуб простое сложное",
        verdict: "covered", clause: "п. 1.1 (e2e)", scopeLevel: "program",
      },
      {
        documentId: docId, insuranceCompanyId: insurerId, programName: PROGRAM,
        serviceClass: "имплантация", servicePattern: "имплантация зуб",
        verdict: "excluded", clause: "п. 2.1 (e2e)", scopeLevel: "program",
      },
    ])
    await db.insert(schema.programAlias).values({
      insuranceCompanyId: insurerId,
      aliasNorm: "тестовая стоматология (e2e)",
      programName: PROGRAM,
      kind: "program",
    }).onConflictDoNothing()
  }

  // письма пациента: прикрепление + действующее ГП (email_message обязателен по FK)
  const already = await db.select({ id: schema.guaranteeLetter.id }).from(schema.guaranteeLetter)
  if (already.length === 0) {
    const [em] = await db
      .insert(schema.emailMessage)
      .values({
        mailbox: "e2e@local", organizationId: orgId, messageId: `<e2e-${randomUUID()}@local>`,
        fromAddr: "e2e@e2e.example", subject: "Тестовое письмо (e2e)",
        receivedAt: new Date("2026-01-10T09:00:00Z"), rawSha256: `e2e-${randomUUID()}`,
      })
      .returning()
    await db.insert(schema.guaranteeLetter).values([
      {
        emailMessageId: em.id, insuranceCompanyId: insurerId, organizationId: orgId,
        patientFullName: PATIENT.fullName, patientBirthDate: PATIENT.birthDate,
        policyNumber: "E2E-000001", approvalStatus: "enroll", docType: "enroll",
        services: ["Тестовая стоматология (e2e)"], letterDate: "2026-01-10", source: "e2e",
      },
      {
        emailMessageId: em.id, insuranceCompanyId: insurerId, organizationId: orgId,
        patientFullName: PATIENT.fullName, patientBirthDate: PATIENT.birthDate,
        policyNumber: "E2E-000001", approvalStatus: "approved", docType: "guarantee",
        services: ["Эндодонтическое лечение 25 зуба"], letterDate: "2026-06-01",
        validUntil: "2099-01-01", source: "e2e",
      },
    ])
  }

  console.log("[e2e-fixtures] готово: пациент, программа, правила, ГП")
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
