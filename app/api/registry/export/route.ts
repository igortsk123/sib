import ExcelJS from "exceljs"

import { env } from "@/lib/env"
import { searchLetters } from "@/lib/server/registry/queries"
import { requireUser } from "@/lib/server/auth/guards"
import { STATUS_LABELS, SOURCE_LABELS } from "@/lib/letter-status"

// Выгрузка реестра ГП в Excel (бриф §10). Только по сессии (ПДн). Отдельная колонка
// «Требует проверки» + кликабельная ссылка на карточку для сверки глазами.
export async function GET(req: Request) {
  const auth = await requireUser()
  if (!auth.ok) return new Response("Unauthorized", { status: 401 })
  const q = new URL(req.url).searchParams.get("q") ?? undefined
  const rows = await searchLetters({ q }, 5000)
  const appUrl = env.APP_URL.replace(/\/+$/, "")

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Реестр ГП")
  ws.columns = [
    { header: "Пациент", key: "patient", width: 28 },
    { header: "Страховая", key: "insurer", width: 18 },
    { header: "Полис", key: "policy", width: 18 },
    { header: "№ ГП", key: "letterNumber", width: 16 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Источник", key: "source", width: 12 },
    { header: "Дата письма", key: "letterDate", width: 14 },
    { header: "Требует проверки", key: "review", width: 16 },
    { header: "Что проверить", key: "reviewNote", width: 26 },
    { header: "Ссылка для проверки", key: "link", width: 22 },
  ]
  ws.getRow(1).font = { bold: true }

  for (const r of rows) {
    const row = ws.addRow({
      patient: r.patient ?? "",
      insurer: r.insurer ?? "",
      policy: r.policy ?? "",
      letterNumber: r.letterNumber ?? "",
      status: STATUS_LABELS[r.status] ?? r.status,
      source: SOURCE_LABELS[r.source ?? ""] ?? r.source ?? "",
      letterDate: r.letterDate ?? "",
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
