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
import { createClinic } from "@/lib/server/clinics/actions"

export function CreateClinicDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await createClinic({ name, ownerPhone: ownerPhone || undefined, ownerName: ownerName || undefined })
      if (!res.ok) return setError(res.error)
      setOpen(false)
      setName("")
      setOwnerPhone("")
      setOwnerName("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Добавить клинику
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая клиника</DialogTitle>
          <DialogDescription>
            Можно сразу назначить владельца — он войдёт по телефону через Telegram и добавит сотрудников.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cname">Название клиники</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ophone">Телефон владельца (необязательно)</Label>
            <Input id="ophone" type="tel" placeholder="+7…" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oname">Имя владельца (необязательно)</Label>
            <Input id="oname" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
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
