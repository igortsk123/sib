import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
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
export const DEMO_PATIENT = "Демостендов Демо Демович"
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
  const userId =
    userRows[0]?.id ??
    (await db.insert(schema.appUser).values({ phone: TEST_PHONE }).returning())[0].id
  // Платформенный админ — чтобы e2e шли в режиме «все клиники» (orgId = null). Именно этот режим
  // проверяет границу контуров (ADR D50): без него фильтр демо просто не задействован.
  await db.update(schema.appUser).set({ isPlatformAdmin: true }).where(eq(schema.appUser.id, userId))
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
      // Гейт D48: письмо нового типа — отложено (is_held), в общем списке его быть НЕ должно,
      // в реестре — баннер «Есть новые типы писем».
      {
        emailMessageId: em.id, insuranceCompanyId: insurerId, organizationId: orgId,
        patientFullName: "Отложенный Тип Письма", patientBirthDate: "1990-01-01",
        policyNumber: "E2E-HELD-01", approvalStatus: "unknown", docType: "referral",
        services: ["Новый тип (e2e)"], letterDate: "2026-07-01", source: "e2e",
        isHeld: true,
      },
    ])
  }

  // Граница контуров (ADR D50): демо-организация со «своей» записью. В рабочем контуре
  // («все клиники») её быть не должно ни в реестре, ни в пациентах — это проверяет e2e.
  const demoRows = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.isDemo, true))
  const demoOrgId =
    demoRows[0]?.id ??
    (
      await db
        .insert(schema.organization)
        .values({ name: "Демо-клиника (e2e)", isDemo: true })
        .returning()
    )[0].id
  const demoLetters = await db
    .select({ id: schema.guaranteeLetter.id })
    .from(schema.guaranteeLetter)
    .where(eq(schema.guaranteeLetter.organizationId, demoOrgId))
  if (demoLetters.length === 0) {
    const [demoEm] = await db
      .insert(schema.emailMessage)
      .values({
        mailbox: "demo@local", organizationId: demoOrgId, messageId: `<demo-${randomUUID()}@local>`,
        fromAddr: "demo@e2e.example", subject: "Демо-письмо (стенд)",
        receivedAt: new Date("2026-01-11T09:00:00Z"), rawSha256: `demo-${randomUUID()}`,
      })
      .returning()
    await db.insert(schema.guaranteeLetter).values({
      emailMessageId: demoEm.id, insuranceCompanyId: insurerId, organizationId: demoOrgId,
      patientFullName: DEMO_PATIENT, patientBirthDate: "1980-02-02",
      policyNumber: "DEMO-000001", approvalStatus: "approved", docType: "guarantee",
      services: ["Демо-услуга (стенд)"], letterDate: "2026-01-11", source: "demo",
    })
  }

  console.log("[e2e-fixtures] готово: пациент, программа, правила, ГП, демо-контур")
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
