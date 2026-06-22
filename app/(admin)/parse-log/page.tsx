import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { parseLog } from "@/lib/db/schema"
import { METHOD_LABELS } from "@/lib/letter-status"
import { FIELD_HINTS } from "@/lib/review-hints"

export const dynamic = "force-dynamic"

// Журнал распознавания: как разобрана каждая запись и какие поля парсер не нашёл (добрал ИИ).
// Назначение — ловить, где парсер промахивается / источник сменил форму → донастройка парсера.
const field = (f: string) => FIELD_HINTS[f] ?? f
const method = (m: string) => METHOD_LABELS[m] ?? m

export default async function ParseLogPage() {
  const rows = await db().select().from(parseLog)
  const total = rows.length

  const byMethod: Record<string, number> = {}
  for (const r of rows) byMethod[r.method ?? "?"] = (byMethod[r.method ?? "?"] ?? 0) + 1

  type Agg = { n: number; gaps: Record<string, number>; methods: Record<string, number> }
  const ins: Record<string, Agg> = {}
  const globalGaps: Record<string, number> = {}
  for (const r of rows) {
    const k = r.insurer ?? "—"
    ins[k] ??= { n: 0, gaps: {}, methods: {} }
    ins[k].n++
    const m = r.method ?? "?"
    ins[k].methods[m] = (ins[k].methods[m] ?? 0) + 1
    for (const f of [...(r.detGap ?? []), ...(r.llmFilled ?? [])]) {
      ins[k].gaps[f] = (ins[k].gaps[f] ?? 0) + 1
      globalGaps[f] = (globalGaps[f] ?? 0) + 1
    }
  }
  const topGlobal = Object.entries(globalGaps).sort((a, b) => b[1] - a[1])
  const fmtGaps = (g: Record<string, number>) =>
    Object.entries(g)
      .sort((a, b) => b[1] - a[1])
      .map(([f, c]) => `${field(f)} ×${c}`)
      .join(", ") || "—"
  const fmtMethods = (m: Record<string, number>) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => `${method(k)}: ${c}`)
      .join("  ·  ")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Журнал распознавания</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Показывает, <span className="font-medium">как</span> разобрана каждая запись и какие поля
          автоматический «Парсер» не нашёл — их добрал «ИИ».
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 text-sm leading-relaxed">
          <p className="font-medium">Зачем этот журнал</p>
          <p className="mt-1 text-muted-foreground">
            «Парсер» — это автоматические правила: он дешёвый, быстрый и стабильный. «ИИ» — подстраховка, он
            дороже и медленнее. Цель — чтобы как можно больше полей находил сам парсер. Если поле, которое
            раньше брал парсер, вдруг начинает добирать ИИ — значит страховая <b>изменила форму документа</b>,
            и правило парсера нужно донастроить.
          </p>
          <p className="mt-2 font-medium">Как пользоваться</p>
          <p className="mt-1 text-muted-foreground">
            Смотрите блок <span className="font-medium">«Что добирал ИИ»</span> — это список полей и страховых,
            где парсер промахивается. Это и есть задачи на улучшение: чем меньше тут записей, тем надёжнее
            и дешевле распознавание.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{total}</div>
            <div className="text-xs text-muted-foreground">записей разобрано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{byMethod["deterministic"] ?? 0}</div>
            <div className="text-xs text-muted-foreground">только парсером (без ИИ)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{byMethod["deterministic+llm"] ?? 0}</div>
            <div className="text-xs text-muted-foreground">парсер + ИИ добрал</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{(byMethod["llm"] ?? 0) + (byMethod["llm_vision"] ?? 0)}</div>
            <div className="text-xs text-muted-foreground">полностью ИИ</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Что добирал ИИ (поля, которые парсер не нашёл)</CardTitle>
        </CardHeader>
        <CardContent>
          {topGlobal.length ? (
            <div className="flex flex-wrap gap-2">
              {topGlobal.map(([f, c]) => (
                <span key={f} className="rounded-md bg-muted px-2 py-1 text-sm">
                  {field(f)} <span className="font-semibold">×{c}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Пусто — парсер находит все поля сам.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">По страховым</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Страховая</th>
                <th className="py-2 pr-4 font-medium">Записей</th>
                <th className="py-2 pr-4 font-medium">Чем разобрано</th>
                <th className="py-2 font-medium">Что добирал ИИ</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ins)
                .sort((a, b) => b[1].n - a[1].n)
                .map(([name, a]) => (
                  <tr key={name} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{name}</td>
                    <td className="py-2 pr-4">{a.n}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{fmtMethods(a.methods)}</td>
                    <td className="py-2 text-muted-foreground">{fmtGaps(a.gaps)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
