"use client"

import { useState, useTransition } from "react"

import { askCoverage, type AskCoverageResult } from "@/lib/server/coverage/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// Вопрос «можно ли делать?» в карточке пациента (фаза Ф-A). Врач или регистратура вводит
// услугу (и сумму, если есть) — ответ мгновенный по гейтам, с пунктами документов.
const VERDICT: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  yes: { label: "ДА, покрыто", variant: "default" },
  no: { label: "НЕТ", variant: "destructive" },
  approval: { label: "НУЖНО СОГЛАСОВАНИЕ", variant: "secondary" },
  need_guarantee: { label: "ЗАПРОСИТЬ ГАРАНТИЙНОЕ ПИСЬМО", variant: "secondary" },
  unknown: { label: "НЕТ ЯВНОГО ОТВЕТА", variant: "outline" },
}

export function AskCoverage({ patientKey }: { patientKey: string }) {
  const [service, setService] = useState("")
  const [amount, setAmount] = useState("")
  const [result, setResult] = useState<AskCoverageResult | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = amount.trim() ? Number(amount.replace(/\s/g, "")) : null
    start(async () => {
      setResult(await askCoverage({ patientKey, serviceText: service, amount: Number.isFinite(amountNum) ? amountNum : null }))
    })
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Можно ли делать? Спросить по правилам</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <Input
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Услуга: удаление зуба 3.7, имплантация, лечение кариеса…"
            className="min-w-[260px] flex-1"
            required
            minLength={3}
          />
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Сумма, ₽ (необязательно)"
            className="w-44"
            inputMode="numeric"
          />
          <Button type="submit" disabled={pending || service.trim().length < 3}>
            {pending ? "Проверяю…" : "Проверить"}
          </Button>
        </form>

        {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}

        {result?.ok && (
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <Badge variant={VERDICT[result.answer.verdict]?.variant ?? "outline"} className="text-sm">
                {VERDICT[result.answer.verdict]?.label ?? result.answer.verdict}
              </Badge>
            </div>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {result.answer.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {result.answer.warnings.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                {result.answer.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            )}
            {result.answer.matchedRules.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-primary hover:underline">
                  Правила, на которых основан ответ ({result.answer.matchedRules.length})
                </summary>
                <ul className="mt-1 flex flex-col gap-1 text-xs">
                  {result.answer.matchedRules.map((r, i) => (
                    <li key={i}>
                      <span className="font-medium">{r.servicePattern ?? r.serviceClass}</span>
                      {" — "}
                      {r.verdict}
                      {r.conditionText ? ` (${r.conditionText})` : ""} · {r.clause} ·{" "}
                      <a href={`/api/original/program-doc/${r.documentId}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        документ
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
