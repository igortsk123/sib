"use client"

import { useState, useTransition } from "react"

import { guaranteeRequestDraft, type GuaranteeDraftResult } from "@/lib/server/coverage/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Черновик запроса ГП (Ф-D): появляется под ответом «запросить гарантийное письмо».
// Отправка из системы отключена (почта read-only) — копируем текст или скачиваем .eml
// и отправляем из ящика dms@ ответом в тот же тред.

type Props = { patientKey: string; serviceText: string; amount: number | null }

export function GuaranteeRequest({ patientKey, serviceText, amount }: Props) {
  const [result, setResult] = useState<GuaranteeDraftResult | null>(null)
  const [to, setTo] = useState("")
  const [body, setBody] = useState("")
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  function load() {
    start(async () => {
      const r = await guaranteeRequestDraft({ patientKey, serviceText, amount })
      setResult(r)
      if (r.ok) {
        setTo(r.draft.to)
        setBody(r.draft.body)
      }
    })
  }

  function copy() {
    void navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadEml() {
    if (!result?.ok) return
    const headers = result.draft.emlHeaders.replace(/^To: .*$/m, `To: ${to}`)
    const eml = `${headers}\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}`
    const url = URL.createObjectURL(new Blob([eml], { type: "message/rfc822" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "zapros-gp.eml"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!result?.ok) {
    return (
      <div className="flex flex-col gap-1">
        <div>
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={pending}>
            {pending ? "Собираю черновик…" : "Составить запрос в страховую"}
          </Button>
        </div>
        {result && !result.ok && <p className="text-xs text-destructive">{result.error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Черновик ответа в тот же тред. Отправьте вручную из ящика ДМС — отправка из системы отключена.
      </p>
      <label className="flex items-center gap-2 text-xs">
        <span className="w-12 shrink-0 text-muted-foreground">Кому</span>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="адрес страховой — не найден, вставьте вручную" className="h-8 text-xs" />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <span className="w-12 shrink-0 text-muted-foreground">Тема</span>
        <Input value={result.draft.subject} readOnly className="h-8 bg-muted text-xs" />
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={copy}>
          {copied ? "Скопировано ✓" : "Скопировать текст"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={downloadEml}>
          Скачать .eml
        </Button>
      </div>
    </div>
  )
}
