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
    { header: "Полис", key: "policy", width: 20 },
    { header: "№ договора", key: "contractNumber", width: 22 },
    { header: "№ ГП", key: "letterNumber", width: 16 },
    { header: "№ обращения", key: "caseNumber", width: 16 },
    { header: "Тип", key: "docType", width: 18 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Дата письма", key: "letterDate", width: 14 },
    { header: "Срок действия письма", key: "validUntil", width: 18 },
    { header: "Период обслуживания", key: "coverage", width: 22 },
    { header: "Ограничение (лимит/условия)", key: "restriction", width: 40 },
    { header: "Услуги", key: "services", width: 34 },
    { header: "Источник", key: "source", width: 12 },
    { header: "Метод распознавания", key: "method", width: 18 },
    { header: "Карточка (всё в одном месте)", key: "link", width: 26 },
  ]
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: "FFFFFFFF" } }
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } }
  head.alignment = { vertical: "middle" }
  ws.views = [{ state: "frozen", ySplit: 1 }] // шапка зафиксирована при прокрутке
  ws.autoFilter = { from: "A1", to: "Q1" } // фильтры по колонкам для анализа

  const METHOD_LABELS: Record<string, string> = {
    deterministic: "Парсер",
    "deterministic+llm": "Парсер+LLM",
    llm: "LLM",
    llm_vision: "LLM (скан)",
  }

  for (const r of rows) {
    const services = Array.isArray(r.services)
      ? (r.services as unknown[]).filter(Boolean).map(String).join(", ")
      : ""
    const row = ws.addRow({
      patient: r.patient ?? "",
      birthDate: r.birthDate ?? "",
      insurer: r.insurer ?? "",
      policy: r.policy ?? "",
      contractNumber: r.contractNumber ?? "",
      letterNumber: r.letterNumber ?? "",
      caseNumber: r.caseNumber ?? "",
      docType: docTypeLabel(r.docType, r.status),
      status: STATUS_LABELS[r.status] ?? r.status,
      letterDate: r.letterDate ?? "",
      validUntil: r.validUntil ?? "",
      coverage: r.coverageFrom || r.coverageTo ? `${r.coverageFrom ?? "…"} — ${r.coverageTo ?? "…"}` : "",
      restriction: [r.amountLimit, r.conditions].filter(Boolean).join("; "),
      services,
      source: SOURCE_LABELS[r.source ?? ""] ?? r.source ?? "",
      method: METHOD_LABELS[r.method ?? ""] ?? r.method ?? "",
      link: { text: "Открыть карточку", hyperlink: `${appUrl}/registry/${r.id}` },
    })
    row.alignment = { vertical: "top", wrapText: true }
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
