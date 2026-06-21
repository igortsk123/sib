import ExcelJS from "exceljs"

import { env } from "@/lib/env"
import { searchLetters } from "@/lib/server/registry/queries"
import { requireUser } from "@/lib/server/auth/guards"
import { resolveRegistryScope } from "@/lib/server/scope"
import { STATUS_LABELS, SOURCE_LABELS, docTypeLabel } from "@/lib/letter-status"

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
      source: p.get("source") ?? undefined,
      dateFrom: p.get("from") ?? undefined,
      dateTo: p.get("to") ?? undefined,
      orgId: scope.orgId,
    },
    5000,
  )
  const appUrl = env.APP_URL.replace(/\/+$/, "")

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Реестр ГП")
  ws.columns = [
    { header: "Пациент", key: "patient", width: 28 },
    { header: "Дата рождения", key: "birthDate", width: 14 },
    { header: "Страховая", key: "insurer", width: 18 },
    { header: "Полис", key: "policy", width: 18 },
    { header: "№ ГП", key: "letterNumber", width: 16 },
    { header: "№ договора", key: "contractNumber", width: 22 },
    { header: "Тип", key: "docType", width: 18 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Источник", key: "source", width: 12 },
    { header: "Дата письма", key: "letterDate", width: 14 },
    { header: "Период обслуживания", key: "coverage", width: 22 },
    { header: "Ограничение", key: "restriction", width: 34 },
    { header: "Требует проверки", key: "review", width: 16 },
    { header: "Что проверить", key: "reviewNote", width: 26 },
    { header: "Ссылка для проверки", key: "link", width: 22 },
  ]
  ws.getRow(1).font = { bold: true }

  for (const r of rows) {
    const row = ws.addRow({
      patient: r.patient ?? "",
      birthDate: r.birthDate ?? "",
      insurer: r.insurer ?? "",
      policy: r.policy ?? "",
      letterNumber: r.letterNumber ?? "",
      contractNumber: r.contractNumber ?? "",
      docType: docTypeLabel(r.status),
      status: STATUS_LABELS[r.status] ?? r.status,
      source: SOURCE_LABELS[r.source ?? ""] ?? r.source ?? "",
      letterDate: r.letterDate ?? "",
      coverage: r.coverageFrom || r.coverageTo ? `${r.coverageFrom ?? "…"} — ${r.coverageTo ?? "…"}` : "",
      restriction: [r.amountLimit, r.conditions].filter(Boolean).join("; "),
      review: r.needsReview ? "ДА — проверить" : "ок",
      reviewNote: r.needsReview ? (r.reviewNote ?? "сверить с оригиналом") : "",
      link: { text: "Открыть оригинал", hyperlink: `${appUrl}/registry/${r.id}` },
    })
    // подсветить строки на проверку (мягкий жёлтый фон)
    if (r.needsReview) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } }
      })
    }
    const linkCell = row.getCell("link")
    linkCell.font = { color: { argb: "FF1A56DB" }, underline: true }
  }

  const buf = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reestr-gp-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  })
}
