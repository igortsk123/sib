"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Bot } from "lucide-react"

import { coverageChatSend } from "@/lib/server/coverage/actions"
import type { ChatMessageDTO } from "@/lib/server/coverage/chat"
import { GuaranteeRequest } from "@/components/admin/guarantee-request"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// Чат по правилам пациента (владелец 26.07, v2): «просто клиника общается с ИИ» — много
// вопросов и ответов. История хранится в БД и ОБЩАЯ: видно, кто и когда спрашивал
// (регистратура спросила — врач видит). Контекст правил уходит в LLM с каждым сообщением.

const timeFmt = new Intl.DateTimeFormat("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

function stamp(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : timeFmt.format(d)
}

// ИИ отвечает с markdown-жирным (**…**) — рендерим его, остальной markdown не трогаем
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part,
  )
}

export function CoverageChatPanel({
  patientKey,
  initialMessages,
}: {
  patientKey: string
  initialMessages: ChatMessageDTO[]
}) {
  const [messages, setMessages] = useState<ChatMessageDTO[]>(initialMessages)
  const [q, setQ] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const anchorRef = useRef<HTMLDivElement | null>(null)

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""

  useEffect(() => {
    // автоскролл к последнему сообщению (в т.ч. к «печатает…»)
    anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages, pending])

  function send(e: React.FormEvent) {
    e.preventDefault()
    const question = q.trim()
    if (question.length < 2 || pending) return
    // оптимистичный пузырь вопроса — ответ ИИ придёт вместе со свежей историей из БД
    setMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, role: "user", authorName: "вы", content: question, createdAt: new Date().toISOString() },
    ])
    setQ("")
    start(async () => {
      const r = await coverageChatSend({ patientKey, question })
      if (r.messages) setMessages(r.messages)
      setError(r.ok ? null : r.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4 text-primary" aria-hidden /> Спросить по правилам (ИИ)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Спросите, покроет ли страховая услугу этому пациенту: например, «удаление зуба 3.7 под
            общей анестезией» или «имплантация за 45 000». История вопросов сохраняется и видна коллегам.
          </p>
        )}
        {messages.length > 0 && (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1 text-sm">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}>
                <span className="px-1 text-[11px] text-muted-foreground">
                  {m.role === "user" ? (m.authorName ?? "сотрудник") : "ИИ"} · {stamp(m.createdAt)}
                </span>
                <span
                  className={
                    m.role === "user"
                      ? "inline-block max-w-[85%] rounded-lg bg-primary px-3 py-1.5 text-primary-foreground"
                      : "inline-block max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-1.5"
                  }
                >
                  {m.role === "assistant" ? renderBold(m.content) : m.content}
                </span>
              </li>
            ))}
            {pending && (
              <li className="flex flex-col items-start">
                <span className="px-1 text-[11px] text-muted-foreground">ИИ</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-2">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              </li>
            )}
            <div ref={anchorRef} />
          </ul>
        )}
        <form onSubmit={send} className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Вопрос по покрытию: услуга, сумма, «а если боль острая?»…"
            className="flex-1"
          />
          <Button type="submit" disabled={pending || q.trim().length < 2}>
            {pending ? "…" : "Спросить"}
          </Button>
        </form>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {lastQuestion && (
          <div className="border-t border-border pt-3">
            <GuaranteeRequest patientKey={patientKey} serviceText={lastQuestion.slice(0, 300)} amount={null} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
