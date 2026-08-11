import "server-only"

import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { err, ok, type Result } from "@/lib/result"

// ─────────────────────────────────────────────────────────────────────
// Обёртка Яндекс.Директ API v5 (конституция §5: типизированный Result, без сырых исключений).
// Робот-минусовщик читает отчёт поисковых запросов и ДОБАВЛЯЕТ минус-слова кампаниям.
// Больше он не умеет ничего: фразы, ставки, статусы кампаний и бюджеты не трогаются никогда.
// Токен — YANDEX_DIRECT_TOKEN (в /opt/sib.env, в git не попадает; см. _secrets/ACCESS.md).
// ─────────────────────────────────────────────────────────────────────

const API = "https://api.direct.yandex.com/json/v5/"

function headers(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${env.YANDEX_DIRECT_TOKEN}`,
    "Accept-Language": "ru",
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  }
}

export function directConfigured(): boolean {
  return Boolean(env.YANDEX_DIRECT_TOKEN)
}

export function campaignIds(): number[] {
  return env.ADS_CAMPAIGN_IDS.split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

async function call<T>(service: string, method: string, params: unknown): Promise<Result<T>> {
  if (!directConfigured()) return err("Директ не настроен (нет YANDEX_DIRECT_TOKEN)")
  try {
    const res = await fetch(API + service, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ method, params }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      log.error("direct_http_error", { service, method, status: res.status, body: body.slice(0, 300) })
      return err(`Директ ${service}.${method}: HTTP ${res.status}`)
    }
    const data = (await res.json()) as { result?: T; error?: { error_string?: string; error_detail?: string } }
    if (data.error) {
      log.error("direct_api_error", { service, method, error: data.error })
      return err(`Директ ${service}.${method}: ${data.error.error_string} — ${data.error.error_detail}`)
    }
    return ok(data.result as T)
  } catch (e) {
    log.error("direct_call_failed", { service, method, error: String(e) })
    return err(`Не удалось обратиться к Директу (${service}.${method})`)
  }
}

export type SearchQueryRow = { query: string; impressions: number; clicks: number; cost: number }

/**
 * Отчёт поисковых запросов за последние 3 дня. Робот без состояния: каждый час берёт
 * скользящее окно и сам отбрасывает то, что уже перекрыто минусами, — переживает пропуски запусков.
 * Reports API отвечает 201/202, пока считает отчёт → короткий поллинг.
 */
export async function searchQueryReport(ids: number[]): Promise<Result<SearchQueryRow[]>> {
  if (!directConfigured()) return err("Директ не настроен (нет YANDEX_DIRECT_TOKEN)")
  const spec = {
    params: {
      SelectionCriteria: {
        Filter: [{ Field: "CampaignId", Operator: "IN", Values: ids.map(String) }],
      },
      FieldNames: ["Query", "Impressions", "Clicks", "Cost"],
      ReportName: `sib_watchdog_${Date.now()}`,
      ReportType: "SEARCH_QUERY_PERFORMANCE_REPORT",
      DateRangeType: "LAST_3_DAYS",
      Format: "TSV",
      IncludeVAT: "YES",
    },
  }
  const h = headers({
    processingMode: "auto",
    returnMoneyInMicros: "false",
    skipReportHeader: "true",
    skipReportSummary: "true",
  })
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const res = await fetch(API + "reports", { method: "POST", headers: h, body: JSON.stringify(spec) })
      if (res.status === 201 || res.status === 202) {
        await new Promise((r) => setTimeout(r, 10_000))
        continue
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        log.error("direct_report_error", { status: res.status, body: body.slice(0, 300) })
        return err(`Директ reports: HTTP ${res.status}`)
      }
      const tsv = await res.text()
      const rows: SearchQueryRow[] = []
      for (const line of tsv.split("\n")) {
        const cells = line.split("\t")
        if (cells.length < 4 || cells[0] === "Query" || !cells[0]?.trim()) continue
        rows.push({
          query: cells[0]!.trim(),
          impressions: Number(cells[1]) || 0,
          clicks: Number(cells[2]) || 0,
          cost: Number(cells[3]) || 0,
        })
      }
      return ok(rows)
    } catch (e) {
      log.error("direct_report_failed", { error: String(e) })
      return err("Не удалось получить отчёт Директа")
    }
  }
  return err("Директ не отдал отчёт за 2 минуты")
}

export async function activeKeywords(ids: number[]): Promise<Result<string[]>> {
  const res = await call<{ Keywords?: { Keyword: string; State: string }[] }>("keywords", "get", {
    SelectionCriteria: { CampaignIds: ids },
    FieldNames: ["Keyword", "State"],
  })
  if (!res.ok) return res
  return ok((res.value.Keywords ?? []).filter((k) => k.State === "ON").map((k) => k.Keyword))
}

export async function campaignNegatives(ids: number[]): Promise<Result<Map<number, string[]>>> {
  const res = await call<{ Campaigns?: { Id: number; NegativeKeywords?: { Items?: string[] } }[] }>(
    "campaigns",
    "get",
    { SelectionCriteria: { Ids: ids }, FieldNames: ["Id", "NegativeKeywords"] },
  )
  if (!res.ok) return res
  const map = new Map<number, string[]>()
  for (const c of res.value.Campaigns ?? []) map.set(c.Id, c.NegativeKeywords?.Items ?? [])
  return ok(map)
}

/** Директ хранит минус-слова кампании одной строкой; общий лимит — 65 535 символов. */
export const NEGATIVES_CHARS_LIMIT = 60_000

export async function addNegatives(
  campaignId: number,
  current: string[],
  add: string[],
): Promise<Result<number>> {
  if (!add.length) return ok(0)
  const items = [...current, ...add]
  const size = items.join(" ").length
  if (size > NEGATIVES_CHARS_LIMIT) {
    return err(`минус-лист кампании ${campaignId} переполнен (${size} симв.) — нужна ручная чистка`)
  }
  const res = await call<unknown>("campaigns", "update", {
    Campaigns: [{ Id: campaignId, NegativeKeywords: { Items: items } }],
  })
  if (!res.ok) return res
  return ok(add.length)
}
