"use client"

import { useState, useTransition } from "react"

import { setStaffEmail } from "@/lib/server/staff/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Инлайн-правка почты сотрудника (необязательна — на неё уведомления).
export function StaffEmailCell({
  organizationId,
  userId,
  email,
}: {
  organizationId: string
  userId: string
  email: string | null
}) {
  const [v, setV] = useState(email ?? "")
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState("")

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-sm text-primary hover:underline">
        {email || <span className="text-muted-foreground">добавить почту</span>}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        type="email"
        placeholder="name@clinic.ru"
        className="h-8 w-44"
      />
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setError("")
          start(async () => {
            const r = await setStaffEmail({ organizationId, userId, email: v })
            if (!r.ok) setError(r.error)
            else setEditing(false)
          })
        }}
      >
        OK
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setV(email ?? ""); setEditing(false) }}>✕</Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
