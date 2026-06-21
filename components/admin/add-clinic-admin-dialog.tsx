"use client"

import { useState, useTransition } from "react"
import { ShieldPlus } from "lucide-react"

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
import { addClinicOwner } from "@/lib/server/clinics/actions"

export function AddClinicAdminDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await addClinicOwner({ organizationId, phone, name: name || undefined })
      if (!res.ok) return setError(res.error)
      setOpen(false)
      setPhone("")
      setName("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShieldPlus className="size-4" /> Администратор клиники
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Администратор клиники</DialogTitle>
          <DialogDescription>
            Войдёт по телефону через Telegram и сможет добавлять сотрудников. Пока не добавлен — вход закрыт.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="aphone">Телефон</Label>
            <Input id="aphone" type="tel" placeholder="+7…" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="aname">Имя (необязательно)</Label>
            <Input id="aname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Назначение…" : "Назначить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
