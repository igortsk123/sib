"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"

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
import { createInsurer } from "@/lib/server/insurers/actions"

export function CreateInsurerDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [domains, setDomains] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await createInsurer({ name, domains: domains || undefined })
      if (!res.ok) return setError(res.error)
      setOpen(false)
      setName("")
      setDomains("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Добавить страховую
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая страховая</DialogTitle>
          <DialogDescription>
            Домены отправителей используются для автоматического определения страховой по письму.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="iname">Название</Label>
            <Input id="iname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="idomains">Домены (через запятую, необязательно)</Label>
            <Input id="idomains" placeholder="sogaz.ru, reso.ru" value={domains} onChange={(e) => setDomains(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Создание…" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
