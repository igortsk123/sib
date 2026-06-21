"use client"

import { useState, useTransition } from "react"
import { Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addInsurerDomain, removeInsurerDomain } from "@/lib/server/insurers/actions"

// Редактор доменов страховой (только для платформенного админа). Inline: бейджи с удалением + добавление.
export function DomainsEditor({ id, domains }: { id: string; domains: string[] }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function add() {
    if (!value.trim()) return
    setError("")
    start(async () => {
      const res = await addInsurerDomain({ id, domain: value })
      if (!res.ok) return setError(res.error)
      setValue("")
    })
  }

  function remove(domain: string) {
    start(async () => {
      await removeInsurerDomain({ id, domain })
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {domains.length === 0 && <span className="text-xs text-muted-foreground">нет доменов</span>}
        {domains.map((d) => (
          <Badge key={d} variant="outline" className="gap-1 font-mono text-xs">
            {d}
            <button type="button" onClick={() => remove(d)} aria-label={`Убрать ${d}`} disabled={pending}>
              <X className="size-3 hover:text-destructive" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder="добавить домен"
          className="h-8 max-w-44 text-xs"
        />
        <Button type="button" size="icon" variant="ghost" className="size-8" onClick={add} disabled={pending}>
          <Plus className="size-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
