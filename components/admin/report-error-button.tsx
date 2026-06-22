"use client"

import { useState, useTransition } from "react"
import { MessageSquareWarning } from "lucide-react"

import { reportError } from "@/lib/server/error-reports/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ReportErrorButton({ letterId }: { letterId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await reportError({ letterId, message, email: email || undefined })
      if (!res.ok) return setError(res.error)
      setDone(true)
      setMessage("")
      setEmail("")
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setDone(false)
          setError("")
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquareWarning className="size-4" /> Сообщить об ошибке
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сообщить об ошибке в записи</DialogTitle>
          <DialogDescription>
            Опишите, что не так с распознанными данными. Это попадёт в журнал — мы разберём и исправим.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm">Спасибо! Сообщение записано — мы разберём и исправим.</p>
            <Button onClick={() => setOpen(false)}>Закрыть</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Что не так?</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                placeholder="Например: неверный номер полиса / перепутан статус / не тот пациент…"
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Ваша почта (необязательно — сообщим, когда исправим)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@clinic.ru" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Отправка…" : "Отправить"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
