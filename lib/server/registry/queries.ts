import "server-only"
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { resolveCoverage } from "@/lib/server/coverage/resolve"
import { notDemoOrg } from "@/lib/server/demo-org"
import { attachment, emailMessage, guaranteeLetter, insuranceCompany, programDocument } from "@/lib/db/schema"

// Демо-организация (стенд продаж, ADR D22): в админском режиме «все клиники» (orgId=null)
// её записи СКРЫВАЕМ — иначе счётчики/список мешаются с боевыми. Видна при явном выборе.
// Правило общее для реестра, покрытия и дайджеста — lib/server/demo-org.ts.
const notDemoOrgFilter = notDemoOrg(sql`${guaranteeLetter.organizationId}`)

export type RegistryFilter = {
  q?: string // поиск: пациент / полис / № ГП
  insurerId?: string // фильтр: страховая
  status?: string // фильтр: статус
  careType?: string // фильтр: направление (амбулатория|стоматология)
  careTypeIn?: string[] // фильтр-множество направлений (стомат-выгрузка: dentistry+combined)
  source?: string // фильтр: источник
  review?: string // фильтр: проверка ("1" нужна / "0" ок / undefined все)
  dateFrom?: string // фильтр: дата письма от
  dateTo?: string // фильтр: дата письма до
  orgId?: string | null
}

function whereClause(f: RegistryFilter) {
  const conds = []
  // Гейт D48: записи нового типа без активного шаблона в общий список не попадают.
  conds.push(eq(guaranteeLetter.isHeld, false))
  // Скоуп по клинике: реальный id → фильтр; "__none__" → ничего; null → все клиники (админ, БЕЗ демо).
  if (f.orgId === "__none__") conds.push(sql`false`)
  else if (f.orgId) conds.push(eq(guaranteeLetter.organizationId, f.orgId))
  else conds.push(notDemoOrgFilter)
  // ПОИСК (текст): пациент / полис / № ГП; «2003» — год рождения; «дд.мм.гггг» — точная ДР.
  if (f.q && f.q.trim()) {
    const t = f.q.trim()
    const like = `%${t}%`
    const ors = [
      ilike(guaranteeLetter.patientFullName, like),
      ilike(guaranteeLetter.policyNumber, like),
      ilike(guaranteeLetter.letterNumber, like),
    ]
    if (/^(19|20)\d{2}$/.test(t))
      ors.push(sql`extract(year from ${guaranteeLetter.patientBirthDate}) = ${Number(t)}`)
    const dm = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t)
    if (dm) ors.push(sql`${guaranteeLetter.patientBirthDate} = ${`${dm[3]}-${dm[2]}-${dm[1]}`}`)
    conds.push(or(...ors))
  }
  // ФИЛЬТРЫ (точное совпадение): страховая / статус / направление / источник / проверка / дата.
  if (f.insurerId) conds.push(eq(guaranteeLetter.insuranceCompanyId, f.insurerId))
  if (f.status) conds.push(eq(guaranteeLetter.approvalStatus, f.status as never))
  if (f.careType) conds.push(eq(guaranteeLetter.careType, f.careType as never))
  if (f.careTypeIn?.length) conds.push(inArray(guaranteeLetter.careType, f.careTypeIn as never[]))
  if (f.source) conds.push(eq(guaranteeLetter.source, f.source))
  if (f.review === "1") conds.push(eq(guaranteeLetter.needsReview, true))
  else if (f.review === "0") conds.push(eq(guaranteeLetter.needsReview, false))
  // Тип «Прочее» = письмо не распознано как ГП (служебные/акты/запросы) — в реестре по умолчанию
  // НЕ показываем (владелец: «лишние»); доступны через фильтр «Требует проверки». Данные не удаляются.
  if (f.review !== "1") conds.push(sql`${guaranteeLetter.docType} is distinct from 'other'`)
  if (f.dateFrom) conds.push(sql`${guaranteeLetter.letterDate} >= ${f.dateFrom}`)
  if (f.dateTo) conds.push(sql`${guaranteeLetter.letterDate} <= ${f.dateTo}`)
  return conds.length ? and(...conds) : undefined
}

// Реестр ГП с поиском по пациенту/полису/№ГП/страховой. offset — пагинация (страницы UI).
export async function searchLetters(f: RegistryFilter, limit = 500, offset = 0) {
  return db()
    .select({
      id: guaranteeLetter.id,
      patient: guaranteeLetter.patientFullName,
      birthDate: guaranteeLetter.patientBirthDate,
      policy: guaranteeLetter.policyNumber,
      letterNumber: guaranteeLetter.letterNumber,
      caseNumber: guaranteeLetter.caseNumber,
      contractNumber: guaranteeLetter.contractNumber,
      docType: guaranteeLetter.docType,
      careType: guaranteeLetter.careType,
      status: guaranteeLetter.approvalStatus,
      services: guaranteeLetter.services,
      letterDate: guaranteeLetter.letterDate,
      coverageFrom: guaranteeLetter.coverageFrom,
      coverageTo: guaranteeLetter.coverageTo,
      validUntil: guaranteeLetter.validUntil,
      amountLimit: guaranteeLetter.amountLimit,
      conditions: guaranteeLetter.conditions,
      source: guaranteeLetter.source,
      method: guaranteeLetter.method,
      fieldStatus: guaranteeLetter.fieldStatus,
      isDuplicate: guaranteeLetter.isDuplicate,
      needsReview: guaranteeLetter.needsReview,
      reviewNote: guaranteeLetter.reviewNote,
      insurer: insuranceCompany.name,
      receivedAt: emailMessage.receivedAt,
      patientKey: guaranteeLetter.patientKey,
      insurerId: guaranteeLetter.insuranceCompanyId,
    })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .leftJoin(emailMessage, eq(emailMessage.id, guaranteeLetter.emailMessageId))
    .where(whereClause(f))
    .orderBy(desc(emailMessage.receivedAt))
    .limit(limit)
    .offset(offset)
}

// Дентал Про: фолбэк «Страховой программы» — в письмах-откреплениях (и части прикреплений)
// программы нет; берём её из ПОСЛЕДНЕГО прикрепления того же пациента у той же страховой.
export async function latestProgramsByPatient(orgId: string | null | undefined, keys: string[]) {
  const map = new Map<string, string>()
  if (!keys.length) return map
  const rows = await db()
    .select({
      pk: guaranteeLetter.patientKey,
      ic: guaranteeLetter.insuranceCompanyId,
      services: guaranteeLetter.services,
    })
    .from(guaranteeLetter)
    .where(
      and(
        inArray(guaranteeLetter.patientKey, keys),
        eq(guaranteeLetter.docType, "enroll"),
        eq(guaranteeLetter.isDuplicate, false),
        eq(guaranteeLetter.isHeld, false),
        sql`coalesce(jsonb_array_length(${guaranteeLetter.services}),0) > 0`,
        ...(orgId ? [eq(guaranteeLetter.organizationId, orgId)] : []),
      ),
    )
    .orderBy(sql`${guaranteeLetter.letterDate} desc nulls last`) // desc в PG = NULLS FIRST — запись без даты не должна считаться «последней»
  for (const r of rows) {
    const key = `${r.pk}|${r.ic ?? ""}`
    if (!map.has(key)) {
      const prog = Array.isArray(r.services) ? (r.services as unknown[]).filter(Boolean).map(String).join(", ") : ""
      if (prog) map.set(key, prog)
    }
  }
  return map
}

// Число записей ПО ТЕКУЩИМ ФИЛЬТРАМ — для полной пагинации (все страницы кликабельны).
export async function countFiltered(f: RegistryFilter) {
  const r = await db().select({ n: sql<number>`count(*)::int` }).from(guaranteeLetter)
    .where(whereClause(f))
  return r[0]?.n ?? 0
}

// Страховые для фильтра (только те, у кого есть записи в скоупе — но для простоты все активные).
export async function listInsurerOptions() {
  return db()
    .select({ id: insuranceCompany.id, name: insuranceCompany.name })
    .from(insuranceCompany)
    .orderBy(insuranceCompany.name)
}

export async function countLetters(orgId?: string | null) {
  const scope =
    orgId === "__none__"
      ? sql`false`
      : orgId
        ? eq(guaranteeLetter.organizationId, orgId)
        : notDemoOrgFilter // админ «все клиники» — без демо-стенда
  const r = await db().select({ n: sql<number>`count(*)::int` }).from(guaranteeLetter)
    .where(and(scope, eq(guaranteeLetter.isHeld, false)))
  return r[0]?.n ?? 0
}

// Гейт D48: сколько ПИСЕМ нового типа отложено (для баннера «напишите в поддержку»).
export async function countHeldEmails(orgId?: string | null) {
  const scope =
    orgId === "__none__"
      ? sql`false`
      : orgId
        ? eq(guaranteeLetter.organizationId, orgId)
        : notDemoOrgFilter
  const r = await db()
    .select({ n: sql<number>`count(distinct ${guaranteeLetter.emailMessageId})::int` })
    .from(guaranteeLetter)
    .where(and(scope, eq(guaranteeLetter.isHeld, true)))
  return r[0]?.n ?? 0
}

export async function getLetter(id: string) {
  const rows = await db()
    .select({ letter: guaranteeLetter, insurer: insuranceCompany.name })
    .from(guaranteeLetter)
    .leftJoin(insuranceCompany, eq(insuranceCompany.id, guaranteeLetter.insuranceCompanyId))
    .where(eq(guaranteeLetter.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null

  // Источники: все письма записи (письмо ГП + связанные письма-пароли).
  const srcIds = row.letter.sourceEmailIds?.length
    ? row.letter.sourceEmailIds
    : [row.letter.emailMessageId]
  const emails = await db()
    .select({
      id: emailMessage.id,
      mailbox: emailMessage.mailbox,
      receivedAt: emailMessage.receivedAt,
      docType: emailMessage.docType,
    })
    .from(emailMessage)
    .where(inArray(emailMessage.id, srcIds))
  // главное письмо — первым, письма-пароли — после.
  const sourceEmails = emails.sort((a, b) =>
    a.id === row.letter.emailMessageId ? -1 : b.id === row.letter.emailMessageId ? 1 : 0,
  )
  const atts = await db().select().from(attachment).where(inArray(attachment.emailMessageId, srcIds))

  // Условия программы: АКТУАЛЬНЫЕ (не superseded) документы страховой этой записи.
  // Матч программы: program_name ~ услуги записи (подстрочно, в обе стороны); фолбэк — правила страховой.
  let programDocs: { title: string; url: string; kind: string }[] = []
  if (row.letter.insuranceCompanyId) {
    const docs = await db()
      .select({
        title: programDocument.title, kind: programDocument.docKind,
        programName: programDocument.programName,
        sourceUrl: programDocument.sourceUrl, fileUrl: programDocument.fileUrl,
      })
      .from(programDocument)
      .where(and(
        eq(programDocument.insuranceCompanyId, row.letter.insuranceCompanyId),
        isNull(programDocument.supersededById),
      ))
    const services = (Array.isArray(row.letter.services) ? row.letter.services : [])
      .filter(Boolean).map((x) => String(x).toLowerCase())
    const norm = (t: string) => t.toLowerCase()
    const progMatch = docs.filter((d) =>
      d.kind === "program" && d.programName &&
      services.some((sv) => sv.includes(norm(d.programName!).slice(0, 24)) || norm(d.programName!).includes(sv.slice(0, 24))))
    const rules = docs.filter((d) => d.kind === "rules")
    // Показываем ТОЛЬКО документы, относящиеся к программе пациента, плюс общие правила его
    // страховой. Никаких «примеров» чужих договоров: нет документа — так и пишем (решение
    // владельца 2026-07-25).
    programDocs = [...progMatch, ...rules]
      .slice(0, 3)
      .map((d) => ({ title: d.title, url: d.fileUrl ?? d.sourceUrl, kind: d.kind }))
  }
  // Выжимка правил покрытия: программа пациента сильнее общих правил СК (см. resolveCoverage).
  const coverage = row.letter.insuranceCompanyId
    ? await resolveCoverage({
        insuranceCompanyId: row.letter.insuranceCompanyId,
        services: row.letter.services,
        onDate: row.letter.letterDate ? new Date(row.letter.letterDate) : null,
      })
    : { matchedPrograms: [], unmatched: [], fallbackProgram: null, rules: [] }

  return { ...row, sourceEmails, attachments: atts, programDocs, coverage }
}
