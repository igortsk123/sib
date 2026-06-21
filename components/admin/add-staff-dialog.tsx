"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addStaff } from "@/lib/server/staff/actions"
import { ROLE_LABELS, type StaffRole as Role } from "@/lib/roles"

const STAFF_ROLE_LABELS: Record<Role, string> = {
  dms: ROLE_LABELS.dms,
  doctor: ROLE_LABELS.doctor,
  registry: ROLE_LABELS.registry,
  registry_senior: ROLE_LABELS.registry_senior,
}

export function AddStaffDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("dms")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await addStaff({ organizationId, phone, name: name || undefined, role })
      if (!res.ok) return setError(res.error)
      setOpen(false)
      setPhone("")
      setName("")
      setRole("dms")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Добавить сотрудника
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый сотрудник</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sphone">Телефон</Label>
            <Input id="sphone" type="tel" placeholder="+7…" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sname">Имя (необязательно)</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Роль</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STAFF_ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Добавление…" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
