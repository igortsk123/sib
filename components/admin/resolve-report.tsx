"use client"

import { useState, useTransition } from "react"
import { Check, X } from "lucide-react"

import { resolveReport } from "@/lib/server/error-reports/actions"
import { Button } from "@/components/ui/button"

export function ResolveReport({ id, hasEmail }: { id: string; hasEmail: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")

  function resolve(status: "fixed" | "dismissed") {
    setError("")
    start(async () => {
      const note = status === "fixed" ? (prompt("Что исправили? (необязательно)") ?? undefined) : undefined
      const res = await resolveReport({ id, status, note })
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1" disabled={pending} onClick={() => resolve("fixed")}>
          <Check className="size-3.5" /> Исправлено{hasEmail ? " + письмо" : ""}
        </Button>
        <Button size="sm" variant="ghost" className="gap-1" disabled={pending} onClick={() => resolve("dismissed")}>
          <X className="size-3.5" /> Не ошибка
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
