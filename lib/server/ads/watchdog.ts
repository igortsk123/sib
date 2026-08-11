import "server-only"

import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { chatComplete, isLlmConfigured } from "@/lib/server/llm/openai"
import { err, ok, type Result } from "@/lib/result"

import {
  activeKeywords,
  addNegatives,
  campaignIds,
  campaignNegatives,
  directConfigured,
  searchQueryReport,
  type SearchQueryRow,
} from "./direct"
import { blocks, buildProtection, filterRoots, type Rejected } from "./guard"

// ─────────────────────────────────────────────────────────────────────
// Робот-минусовщик Директа (ADR D49). Раз в час:
//   1. отчёт поисковых запросов за 3 дня (скользящее окно — состояние не храним);
//   2. выбрасываем запросы, уже перекрытые действующими минус-словами;
//   3. остаток отдаём LLM (модель ADS_WATCHDOG_MODEL) — она размечает мусор по классам
//      и предлагает минус-корни;
//   4. предохранитель guard.ts решает, что применимо (защита = активные фразы кампаний);
//   5. применяем не больше MAX_NEW_PER_RUN корней и отчитываемся в Telegram.
// Причина: 96% слитого бюджета шло по «синонимам» — руками такой поток не догнать,
// а клик стоит ~90 ₽ (разбор 11.08, completed_plans/ads-synonym-cleanup.md).
// ─────────────────────────────────────────────────────────────────────

/** Больше за раз не применяем: даже при сбое разметки ущерб ограничен и виден в отчёте. */
export const MAX_NEW_PER_RUN = 25
/** Запросы дешевле этого порога и без кликов не тревожим (длинный хвост в 1 показ). */
const MIN_IMPRESSIONS = 1
const CHUNK = 50

const SERVICE = `DocON (sib) — B2B-сервис для МЕДИЦИНСКИХ КЛИНИК: собирает из почты клиники гарантийные
письма страховых по ДМС, распознаёт и сводит в реестр (пациент, полис, СК, услуги, сроки, лимиты),
выгрузка в Excel/МИС. Покупатель — владелец клиники, руководитель ДМС-отдела, старший регистратор,
бухгалтер клиники по ДМС. Подписка 10–20 тыс ₽/мес.`

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["minus", "targets"],
  properties: {
    minus: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["root", "class", "from"],
        properties: {
          root: { type: "string" },
          class: { type: "string", enum: ["patient", "auto", "hr", "accounting", "job", "other"] },
          from: { type: "string" },
        },
      },
    },
    targets: { type: "array", items: { type: "string" } },
  },
} as const

export function buildPrompt(protection: string[], rows: SearchQueryRow[]): string {
  const listing = rows
    .map((r) => `- ${r.query} (${r.impressions}|${r.clicks}|${r.cost.toFixed(0)})`)
    .join("\n")
  return `Ты — специалист по Яндекс.Директу, чистишь кампанию от нецелевых показов.

РЕКЛАМИРУЕТСЯ:
${SERVICE}

ЦЕЛЕВОЙ ЗАПРОС — только со стороны КЛИНИКИ как организации: учёт/реестр/журнал гарантийных писем,
обмен документами со страховой, согласование услуг от лица клиники, счета и взаиморасчёты со
страховыми, автоматизация ДМС-отдела, МИС/программа для клиники.

МУСОР (всё остальное), классы:
- patient — частное лицо: просит ГП у своей страховой, ищет телефон/почту/отдел СК, личный кабинет
  и приложение СК, сроки выдачи, «что это», лечение/анализы/стоматологию/роды по ДМС, цену полиса;
- auto — ОСАГО/КАСКО/ДТП/пострадавший/СТОА/заказ-наряд/запчасти/ремонт авто;
- hr — работодатель, HR, страховой брокер: ДМС для сотрудников, прикрепление, покупка полиса;
- accounting — бухучёт, проводки, страховые взносы, НДФЛ, ФОТ, 1С;
- job — вакансии, резюме, обучение; other — не по теме вовсе.

ЗАЩИЩЁННЫЕ ФРАЗЫ (минус-слово НЕ должно блокировать ни одну из них — иначе будет отклонено):
${protection.map((p) => "- " + p).join("\n")}

ПРАВИЛА:
1. Минус-корень — 1–2 слова ИЗ ЗАПРОСА, в той же форме. Директ сам учитывает словоформы.
2. Бери слово-МАРКЕР КЛАССА (повторяется в мусоре разных запросов): «пострадавш», «запчаст»,
   «кабинет», «приложение», «взносы», «вакансии». Не бери редкое слово из хвоста запроса.
3. Если одиночное слово опасно (встречается и в целевых), сделай минус-ФРАЗУ из 2 слов —
   она сработает, только если в запросе есть ОБА слова: «дмс сотрудников», «счет учета».
4. ПОКРЫТИЕ ОБЯЗАТЕЛЬНО: каждый мусорный запрос из списка должен попасть хотя бы под один корень.
5. Сомневаешься, мусор ли это — не минусуй и запиши запрос в "targets".

ЗАПРОСЫ (показы|клики|расход ₽):
${listing}`
}

type LlmOut = { minus?: { root?: string }[]; targets?: string[] }

async function askLlm(protection: string[], rows: SearchQueryRow[]): Promise<Result<string[]>> {
  const res = await chatComplete(
    [
      { role: "system", content: "Ты возвращаешь только валидный JSON." },
      { role: "user", content: buildPrompt(protection, rows) },
    ],
    {
      model: env.ADS_WATCHDOG_MODEL,
      jsonSchema: SCHEMA as unknown as Record<string, unknown>,
      schemaName: "ads_minus",
      timeoutMs: 180_000,
    },
  )
  if (!res.ok) return res
  try {
    const parsed = JSON.parse(res.value) as LlmOut
    return ok((parsed.minus ?? []).map((m) => m.root ?? "").filter(Boolean))
  } catch {
    log.error("ads_llm_bad_json", { head: res.value.slice(0, 200) })
    return err("LLM вернула не-JSON")
  }
}

export type WatchdogReport = {
  scanned: number
  fresh: number
  applied: string[]
  rejected: Rejected[]
  spendAtRisk: number
  dryRun: boolean
  errors: string[]
}

export async function runWatchdog(): Promise<Result<WatchdogReport>> {
  if (!directConfigured()) return err("Директ не настроен (нет YANDEX_DIRECT_TOKEN)")
  if (!isLlmConfigured()) return err("LLM не настроен (нет OPENAI_API_KEY/OPENAI_BASE_URL)")
  const ids = campaignIds()
  if (!ids.length) return err("Не заданы ADS_CAMPAIGN_IDS")

  const [report, keywords, negatives] = await Promise.all([
    searchQueryReport(ids),
    activeKeywords(ids),
    campaignNegatives(ids),
  ])
  if (!report.ok) return report
  if (!keywords.ok) return keywords
  if (!negatives.ok) return negatives

  const protection = buildProtection(keywords.value)
  const existing = [...new Set([...negatives.value.values()].flat().map((s) => s.toLowerCase()))]

  // агрегируем строки отчёта по запросу (в отчёте одна фраза встречается несколько раз)
  const agg = new Map<string, SearchQueryRow>()
  for (const r of report.value) {
    const a = agg.get(r.query) ?? { query: r.query, impressions: 0, clicks: 0, cost: 0 }
    a.impressions += r.impressions
    a.clicks += r.clicks
    a.cost += r.cost
    agg.set(r.query, a)
  }
  const scanned = agg.size

  // свежее = ещё не перекрыто действующими минусами и не является нашей же целевой фразой
  const fresh = [...agg.values()].filter(
    (r) =>
      r.impressions >= MIN_IMPRESSIONS &&
      !existing.some((e) => blocks(e.replace(/^!/, ""), r.query)) &&
      !protection.some((p) => p === r.query.toLowerCase()),
  )
  const spendAtRisk = fresh.reduce((s, r) => s + r.cost, 0)
  log.info("ads_watchdog_scan", { scanned, fresh: fresh.length, spendAtRisk })

  const dryRun = env.ADS_WATCHDOG_MODE === "dry"
  if (!fresh.length) {
    return ok({ scanned, fresh: 0, applied: [], rejected: [], spendAtRisk: 0, dryRun, errors: [] })
  }

  const errors: string[] = []
  const roots: string[] = []
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const res = await askLlm(protection, fresh.slice(i, i + CHUNK))
    if (!res.ok) errors.push(res.error)
    else roots.push(...res.value)
  }

  const { accepted, rejected } = filterRoots({
    roots,
    protection,
    existing,
    corpus: fresh.map((r) => r.query),
    paid: fresh.filter((r) => r.cost > 0).map((r) => r.query),
  })
  const applied = accepted.slice(0, MAX_NEW_PER_RUN)

  if (!dryRun && applied.length) {
    for (const id of ids) {
      const current = negatives.value.get(id) ?? []
      const add = applied.filter((a) => !current.some((c) => c.toLowerCase().replace(/^!/, "") === a))
      const res = await addNegatives(id, current, add)
      if (!res.ok) errors.push(res.error)
    }
  }
  log.info("ads_watchdog_done", { applied, rejected: rejected.length, dryRun, errors })
  return ok({ scanned, fresh: fresh.length, applied, rejected, spendAtRisk, dryRun, errors })
}

export function formatReport(r: WatchdogReport): string {
  if (!r.applied.length && !r.errors.length) return ""
  const head = r.dryRun ? "🧪 Директ (проверка, без применения)" : "🧹 Директ: добавлены минус-слова"
  const lines = [
    `${head}`,
    `Запросов за 3 дня: ${r.scanned}, новых (не перекрыты минусами): ${r.fresh}` +
      (r.spendAtRisk > 0 ? `, расход по ним ${r.spendAtRisk.toFixed(0)} ₽` : ""),
  ]
  if (r.applied.length) lines.push(`Минусы (${r.applied.length}): ${r.applied.join(", ")}`)
  if (r.rejected.length) lines.push(`Отклонено предохранителем: ${r.rejected.length}`)
  if (r.errors.length) lines.push(`⚠️ Ошибки: ${r.errors.join("; ")}`)
  return lines.join("\n")
}
