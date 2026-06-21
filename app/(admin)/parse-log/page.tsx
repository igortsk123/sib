import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { parseLog } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

// Журнал разбора: где детерминированный парсер промахнулся, а LLM нашла (detGap) — цели донастройки.
// По нему ловим смену форм источником: поле «уезжает» в LLM → видно здесь → правим правило парсинга.
export default async function ParseLogPage() {
  const rows = await db().select().from(parseLog)
  const total = rows.length

  const byMethod: Record<string, number> = {}
  for (const r of rows) byMethod[r.method ?? "?"] = (byMethod[r.method ?? "?"] ?? 0) + 1
  const fallback = byMethod["deterministic+llm"] ?? 0

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
      .map(([f, c]) => `${f}×${c}`)
      .join(", ") || "—"
  const fmtMethods = (m: Record<string, number>) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => `${k}:${c}`)
      .join("  ")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Журнал разбора</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Где парсер промахнулся, а LLM нашла поле (<span className="font-medium">пробелы парсера</span>) — цели
          донастройки. Если поле, что раньше брал парсер, начнёт «уезжать» в LLM — это сигнал, что источник
          сменил форму документа: правим правило.
        </p>
      </div>

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
            <div className="text-xs text-muted-foreground">детерминированно</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{fallback}</div>
            <div className="text-xs text-muted-foreground">с LLM-подстраховкой</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold">{byMethod["llm"] ?? 0}</div>
            <div className="text-xs text-muted-foreground">только LLM</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Пробелы парсера по полям (всего)</CardTitle>
        </CardHeader>
        <CardContent>
          {topGlobal.length ? (
            <div className="flex flex-wrap gap-2">
              {topGlobal.map(([f, c]) => (
                <span key={f} className="rounded-md bg-muted px-2 py-1 text-sm">
                  {f} <span className="font-semibold">×{c}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Пробелов нет — парсер закрывает все поля.</p>
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
                <th className="py-2 pr-4 font-medium">Методы</th>
                <th className="py-2 font-medium">Пробелы парсера (LLM нашла, парсер нет)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ins)
                .sort((a, b) => b[1].n - a[1].n)
                .map(([name, a]) => (
                  <tr key={name} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4 font-medium text-foreground">{name}</td>
                    <td className="py-2 pr-4">{a.n}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{fmtMethods(a.methods)}</td>
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
