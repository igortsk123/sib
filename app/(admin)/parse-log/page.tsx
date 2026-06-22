import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { parseLog } from "@/lib/db/schema"
import { FIELD_HINTS } from "@/lib/review-hints"

export const dynamic = "force-dynamic"

// Журнал распознавания (глобальная сводка). Детально по типам — в шаблонах страховой.
const field = (f: string) => FIELD_HINTS[f] ?? f

export default async function ParseLogPage() {
  const rows = await db().select().from(parseLog)
  const total = rows.length

  const byMethod: Record<string, number> = {}
  for (const r of rows) byMethod[r.method ?? "?"] = (byMethod[r.method ?? "?"] ?? 0) + 1

  const globalGaps: Record<string, number> = {}
  for (const r of rows) {
    for (const f of [...(r.detGap ?? []), ...(r.llmFilled ?? [])]) {
      globalGaps[f] = (globalGaps[f] ?? 0) + 1
    }
  }
  const topGlobal = Object.entries(globalGaps).sort((a, b) => b[1] - a[1])

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
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Детально по типам документов — внутри шаблонов страховой: <span className="font-medium text-foreground">Страховые</span> →
          выбрать страховую → раздел <span className="font-medium text-foreground">«Типы документов»</span> → журнал разбора по каждому шаблону.
        </CardContent>
      </Card>
    </div>
  )
}
