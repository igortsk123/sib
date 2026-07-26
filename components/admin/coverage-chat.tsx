"use client"

import { useState, useTransition } from "react"

import { coverageChat } from "@/lib/server/coverage/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Чат по правилам пациента (владелец 26.07): «чтобы мог доуточнить или спросить —
// в чат подгружается контекст правил». История живёт в состоянии страницы.

type Msg = { role: "user" | "assistant"; content: string }

export function CoverageChat({ patientKey }: { patientKey: string }) {
  const [history, setHistory] = useState<Msg[]>([])
  const [q, setQ] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function send(e: React.FormEvent) {
    e.preventDefault()
    const question = q.trim()
    if (question.length < 2) return
    start(async () => {
      const r = await coverageChat({ patientKey, question, history: history.slice(-8) })
      if (r.ok) {
        setHistory((h) => [...h, { role: "user", content: question }, { role: "assistant", content: r.answer }])
        setQ("")
        setError(null)
      } else {
        setError(r.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      {history.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
          {history.map((m, i) => (
            <li key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={
                  m.role === "user"
                    ? "inline-block max-w-[85%] rounded-md bg-primary px-2 py-1 text-left text-primary-foreground"
                    : "inline-block max-w-[85%] whitespace-pre-wrap rounded-md bg-muted px-2 py-1"
                }
              >
                {m.content}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={send} className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Доуточнить по правилам: например, «а если боль острая?»"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={pending || q.trim().length < 2}>
          {pending ? "…" : "Спросить"}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
