"use client"

import { useMemo, useState, useTransition } from "react"

import { trackGoal } from "@/lib/metrika"
import { createLead, type LeadResult } from "@/lib/server/leads/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Форма заявки лендинга: минимум полей (B2B), honeypot от ботов, цель Метрики «lead»
// (на ней строится оплата за конверсии в Директе — предохранитель от пациентских кликов).

export function LeadForm() {
  const [name, setName] = useState("")
  const [clinic, setClinic] = useState("")
  const [contact, setContact] = useState("")
  const [comment, setComment] = useState("")
  const [website, setWebsite] = useState("") // honeypot
  const [result, setResult] = useState<LeadResult | null>(null)
  const [pending, start] = useTransition()

  const utm = useMemo(() => {
    if (typeof window === "undefined") return {}
    const p = new URLSearchParams(window.location.search)
    const out: Record<string, string> = {}
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = p.get(k)
      if (v) out[k] = v.slice(0, 200)
    }
    return out
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const r = await createLead({ name, clinic, contact, comment, website, utm })
      setResult(r)
      if (r.ok) trackGoal("lead")
    })
  }

  if (result?.ok) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-lg font-medium">Заявка принята 👍</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Свяжемся в рабочее время и договоримся о демо на данных вашей клиники.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" required minLength={2} />
      <Input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Клиника (название или город)" />
      <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Телефон или email" required minLength={5} />
      <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Сколько писем ДМС в месяц? (необязательно)" />
      {/* honeypot: люди не видят, боты заполняют */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Отправляю…" : "Получить демо на данных клиники"}
      </Button>
      {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}
      <p className="text-xs text-muted-foreground">
        Нажимая кнопку, вы соглашаетесь с{" "}
        <a href="/land/privacy" className="underline hover:text-foreground">политикой конфиденциальности</a>.
      </p>
    </form>
  )
}
