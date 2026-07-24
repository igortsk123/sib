import ExcelJS from "exceljs"

import { env } from "@/lib/env"
import { searchLetters } from "@/lib/server/registry/queries"
import { requireUser } from "@/lib/server/auth/guards"
import { resolveRegistryScope } from "@/lib/server/scope"
import { STATUS_LABELS, SOURCE_LABELS, METHOD_LABELS, docTypeLabel, cellText } from "@/lib/letter-status"
import { CARE_TYPE_LABELS } from "@/lib/care-type"
import { isoFromRu, ruDate } from "@/lib/format"

// Партнёр «Клиника Сибирская» — Томск, GMT+7 (без перехода на летнее время).
// «Получено» пишем как Excel-datetime в локальном времени партнёра, не в UTC.
const TOMSK_OFFSET_MS = 7 * 60 * 60 * 1000
const EXCEL_EPOCH_DAYS = 25569 // 1970-01-01 в серийных днях Excel (учитывает баг 1900-02-29)
const MS_PER_DAY = 24 * 60 * 60 * 1000
// UTC-инстант → серийный номер Excel так, чтобы ячейка показывала стенные часы Томска
// независимо от TZ сервера и версии exceljs (детерминированная арифметика на числах).
function tomskExcelSerial(v: Date | string | null | undefined): number | null {
  if (!v) return null
  const t = new Date(v).getTime()
  if (Number.isNaN(t)) return null
  const serial = EXCEL_EPOCH_DAYS + (t + TOMSK_OFFSET_MS) / MS_PER_DAY
  return Math.round(serial * 86400) / 86400 // до целых секунд — убираем плавающий дрейф минуты
}

// Выгрузка реестра ГП в Excel (бриф §10). Только по сессии (ПДн), в скоупе клиники.
// Отдельная колонка «Требует проверки» + кликабельная ссылка на карточку для сверки.
export async function GET(req: Request) {
  const auth = await requireUser()
  if (!auth.ok) return new Response("Unauthorized", { status: 401 })
  const scope = await resolveRegistryScope()
  const p = new URL(req.url).searchParams
  const rows = await searchLetters(
    {
      q: p.get("q") ?? undefined,
      insurerId: p.get("insurer") ?? undefined,
      status: p.get("status") ?? undefined,
      careType: p.get("careType") ?? undefined,
      careTypeIn: [...p.getAll("careTypeIn")].flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean),
      source: p.get("source") ?? undefined,
      review: p.get("review") ?? undefined,
      dateFrom: isoFromRu(p.get("from")), // «дд.мм.гггг» → ISO
      dateTo: isoFromRu(p.get("to")),
      orgId: scope.orgId,
    },
    5000,
  )
  const appUrl = env.APP_URL.replace(/\/+$/, "")
  const stamp0 = new Date().toISOString().slice(0, 10)

  // ── Шаблон «Дентал Про»: массовая загрузка пациентов (создание полисов) — колонки их импортёра
  // байт-в-байт (включая хвостовые пробелы в заголовках). Программа ← услуги/программа записи.
  if (p.get("template") === "dental") {
    const wbD = new ExcelJS.Workbook()
    const wsD = wbD.addWorksheet("Лист1")
    wsD.columns = [
      { header: "Фамилия", key: "f", width: 16 },
      { header: "Имя", key: "i", width: 14 },
      { header: "Отчество ", key: "o", width: 16 },
      { header: "Дата рождения ", key: "bd", width: 14 },
      { header: "Страховая компания ", key: "ins", width: 24 },
      { header: "Страховая программа ", key: "prog", width: 28 },
      { header: "Номер полиса ", key: "pol", width: 20 },
      { header: "Дата начала обслуживания", key: "cf", width: 16 },
      { header: "Дата окончания обслуживания", key: "cto", width: 16 },
    ]
    for (const r of rows) {
      const w = (r.patient ?? "").trim().split(/\s+/)
      const prog = Array.isArray(r.services)
        ? (r.services as unknown[]).filter(Boolean).map(String).join(", ")
        : ""
      wsD.addRow({
        f: w[0] ?? "", i: w[1] ?? "", o: w.slice(2).join(" "),
        bd: ruDate(r.birthDate), ins: r.insurer ?? "", prog,
        pol: r.policy ?? "", cf: ruDate(r.coverageFrom), cto: ruDate(r.coverageTo),
      })
    }
    const bufD = await wbD.xlsx.writeBuffer()
    return new Response(bufD, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dentalpro-${stamp0}.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Реестр ГП")
  const RECEIVED_FMT = "dd.mm.yyyy hh:mm" // «Получено» — дата+время в поясе партнёра
  ws.columns = [
    { header: "ID записи", key: "id", width: 38 }, // уникальный ИД — по нему сообщать о косяках
    { header: "Пациент", key: "patient", width: 28 },
    { header: "Дата рождения", key: "birthDate", width: 14 },
    { header: "Страховая", key: "insurer", width: 18 },
    { header: "Полис", key: "policy", width: 20 },
    { header: "№ договора", key: "contractNumber", width: 22 },
    { header: "№ ГП", key: "letterNumber", width: 16 },
    { header: "№ обращения", key: "caseNumber", width: 16 },
    { header: "Тип", key: "docType", width: 18 },
    { header: "Направление", key: "careType", width: 14 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Дата письма", key: "letterDate", width: 14 },
    { header: "Получено", key: "received", width: 18, style: { numFmt: RECEIVED_FMT } }, // Томск GMT+7
    { header: "Срок действия письма", key: "validUntil", width: 18 },
    { header: "Дата начала обслуживания", key: "coverageFrom", width: 20 },
    { header: "Дата окончания обслуживания", key: "coverageTo", width: 22 },
    { header: "Ограничение (лимит/условия)", key: "restriction", width: 40, style: { alignment: { vertical: "top", wrapText: true } } },
    { header: "Услуги", key: "services", width: 34, style: { alignment: { vertical: "top", wrapText: true } } },
    { header: "Источник", key: "source", width: 12 },
    { header: "Метод распознавания", key: "method", width: 18 },
    { header: "Карточка (всё в одном месте)", key: "link", width: 26 },
    { header: "Дубль", key: "dup", width: 8 }, // D6: повтор той же записи (в конце — не сдвигает колонки)
  ]
  const lastCol = ws.columnCount // держим фильтр в синхроне с числом колонок
  const lastColLetter = ws.getColumn(lastCol).letter
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: "FFFFFFFF" } }
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }
  head.alignment = { vertical: "middle" }
  ws.views = [{ state: "frozen", ySplit: 1 }] // шапка зафиксирована при прокрутке
  ws.autoFilter = { from: "A1", to: `${lastColLetter}1` } // фильтры по колонкам для анализа

  for (const r of rows) {
    const services = Array.isArray(r.services)
      ? (r.services as unknown[]).filter(Boolean).map(String).join(", ")
      : ""
    const row = ws.addRow({
      id: r.id,
      patient: r.patient ?? "",
      birthDate: cellText(ruDate(r.birthDate), r.fieldStatus?.patientBirthDate),
      insurer: r.insurer ?? "",
      policy: cellText(r.policy, r.fieldStatus?.policyNumber),
      contractNumber: cellText(r.contractNumber, r.fieldStatus?.contractNumber),
      letterNumber: cellText(r.letterNumber, r.fieldStatus?.letterNumber),
      caseNumber: cellText(r.caseNumber, r.fieldStatus?.caseNumber),
      docType: docTypeLabel(r.docType, r.status),
      careType: CARE_TYPE_LABELS[r.careType ?? ""] ?? "",
      status: STATUS_LABELS[r.status] ?? r.status,
      letterDate: cellText(ruDate(r.letterDate), r.fieldStatus?.letterDate),
      received: tomskExcelSerial(r.receivedAt),
      validUntil: cellText(ruDate(r.validUntil), r.fieldStatus?.validUntil),
      coverageFrom: cellText(ruDate(r.coverageFrom), r.fieldStatus?.coverageFrom),
      coverageTo: cellText(ruDate(r.coverageTo), r.fieldStatus?.coverageTo),
      restriction: [r.amountLimit, r.conditions].filter(Boolean).join("; "),
      services,
      source: SOURCE_LABELS[r.source ?? ""] ?? r.source ?? "",
      method: METHOD_LABELS[r.method ?? ""] ?? r.method ?? "",
      link: { text: "Открыть карточку", hyperlink: `${appUrl}/registry/${r.id}` },
      dup: r.isDuplicate ? "Да" : "",
    })
    row.getCell("received").numFmt = RECEIVED_FMT // формат даты-времени на ячейке
    const linkCell = row.getCell("link")
    linkCell.font = { color: { argb: "FF1A56DB" }, underline: true }
  }

  const buf = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  const isDental = (p.get("careTypeIn") ?? "").includes("dentistry") || p.get("careType") === "dentistry"
  const fname = isDental ? `reestr-stomatologiya-${stamp}.xlsx` : `reestr-gp-${stamp}.xlsx`
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  })
}
