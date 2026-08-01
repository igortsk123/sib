import "server-only"
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { emailMessage, guaranteeLetter, organization } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────
// Генератор запроса гарантийного письма (фаза Ф-D). Когда ассистент ответил
// «нужен запрос ГП», сотрудник получает ГОТОВЫЙ черновик письма в страховую —
// ответом в тот же тред (Re: + In-Reply-To на последнее письмо страховой по пациенту).
// Отправка из системы ЗАПРЕЩЕНА (правило владельца: почта строго read-only) —
// черновик копируют или скачивают .eml и отправляют из ящика dms@ вручную.
// ─────────────────────────────────────────────────────────────────────

export type GuaranteeRequestDraft = {
  /** Адрес страховой (из последнего письма по пациенту) — пустой, если не нашли. */
  to: string
  subject: string
  body: string
  /** Message-ID письма страховой, на которое отвечаем (reply-in-thread). */
  inReplyTo: string | null
  /** Заголовки .eml (без тела) — клиент склеивает с актуальным текстом тела. */
  emlHeaders: string
}

/** RFC 2047: не-ASCII заголовки кодируются base64, ASCII остаётся как есть. */
export function encodeMimeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`
}

type ComposeInput = {
  fullName: string
  birthDate: string | null
  policyNumber: string | null
  serviceText: string
  amount: number | null
  clinicName: string | null
  lastEmail: { messageId: string | null; from: string | null; subject: string | null } | null
}

const ru = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "—")

/** Чистая сборка черновика — покрыта unit-тестами. */
export function composeGuaranteeRequest(i: ComposeInput): GuaranteeRequestDraft {
  const baseSubject = i.lastEmail?.subject?.trim() || ""
  const subject = baseSubject
    ? /^re:/i.test(baseSubject)
      ? baseSubject
      : `Re: ${baseSubject}`
    : `Запрос гарантийного письма — ${i.fullName}`

  // Структура по практике обмена клиника↔страховая (пациент, полис, услуги, стоимость,
  // просьба гарантировать оплату) — сверено с реальными бланками ГП страховых и обзором ЭДО-обмена.
  const body = [
    "Добрый день!",
    "",
    `${i.clinicName ?? "Клиника"} просит выдать гарантийное письмо на оплату медицинских услуг застрахованному:`,
    "",
    `Пациент: ${i.fullName}`,
    `Дата рождения: ${ru(i.birthDate)}`,
    `Полис ДМС: ${i.policyNumber ?? "уточняется"}`,
    "",
    `Планируемые услуги: ${i.serviceText}`,
    // обычные пробелы в разрядах (toLocaleString даёт U+202F — ломается при копировании в почту)
    ...(i.amount != null
      ? [`Предварительная стоимость: ${String(i.amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} руб.`]
      : []),
    "Диагноз: [заполните перед отправкой]",
    "",
    "Просим подтвердить оплату по полису ДМС и направить гарантийное письмо в адрес клиники.",
    "",
    "С уважением,",
    i.clinicName ?? "клиника",
  ].join("\n")

  const inReplyTo = i.lastEmail?.messageId ?? null
  const headers = [
    "X-Unsent: 1", // почтовые клиенты открывают такой .eml как ЧЕРНОВИК, а не входящее
    `To: ${i.lastEmail?.from ?? ""}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
  ].join("\r\n")

  return { to: i.lastEmail?.from ?? "", subject, body, inReplyTo, emlHeaders: headers }
}

/** Последнее письмо страховой по пациенту — адресат и тред для ответа. */
export async function lastInsurerEmail(patientKey: string, orgId: string | null, insuranceCompanyId: string | null) {
  const rows = await db()
    .select({
      messageId: emailMessage.messageId,
      fromAddr: emailMessage.fromAddr,
      originalFrom: emailMessage.originalFrom,
      subject: emailMessage.subject,
      originalSubject: emailMessage.originalSubject,
    })
    .from(guaranteeLetter)
    .innerJoin(emailMessage, eq(emailMessage.id, guaranteeLetter.emailMessageId))
    .where(
      and(
        eq(guaranteeLetter.patientKey, patientKey),
        eq(guaranteeLetter.isHeld, false),
        orgId && orgId !== "__none__" ? eq(guaranteeLetter.organizationId, orgId) : undefined,
        insuranceCompanyId ? eq(guaranteeLetter.insuranceCompanyId, insuranceCompanyId) : undefined,
      ),
    )
    .orderBy(desc(emailMessage.receivedAt))
    .limit(1)

  const em = rows[0]
  if (!em) return null
  // При пересылке реальный отправитель-страховая — в originalFrom; свои ящики не подставляем.
  const candidates = [em.originalFrom, em.fromAddr].filter((a): a is string => Boolean(a))
  const from = candidates.find((a) => !a.toLowerCase().includes("cl-sib.ru")) ?? null
  return {
    messageId: em.messageId,
    from,
    subject: em.originalSubject?.trim() || em.subject?.trim() || null,
  }
}

export async function clinicName(orgId: string | null): Promise<string | null> {
  if (!orgId || orgId === "__none__") return null
  const [row] = await db().select({ name: organization.name }).from(organization).where(eq(organization.id, orgId))
  return row?.name ?? null
}
