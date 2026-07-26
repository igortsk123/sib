"use client"

import { useState } from "react"
import { Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CARE_TYPE_LABELS } from "@/lib/care-type"
import { DateFieldRu } from "@/components/admin/date-field-ru"

// Экспорт реестра: кнопка → модалка с параметрами (период, направления, шаблон).
export function ExportDialog({ defaultFrom, defaultTo }: { defaultFrom?: string; defaultTo?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Download className="size-4" /> Выгрузить в Excel
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Параметры экспорта</h2>
              <button type="button" aria-label="Закрыть" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <form action="/api/registry/export" method="get" className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Период: с</Label>
                  <DateFieldRu name="from" defaultValue={defaultFrom ?? ""} />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">по</Label>
                  <DateFieldRu name="to" defaultValue={defaultTo ?? ""} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Направления</Label>
                <div className="flex flex-wrap gap-3 text-sm">
                  {(["ambulatory", "dentistry", "combined"] as const).map((c) => (
                    <label key={c} className="flex items-center gap-1.5">
                      <input type="checkbox" name="careTypeIn" value={c} defaultChecked className="accent-primary" />
                      {CARE_TYPE_LABELS[c]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Шаблон</Label>
                <select name="template" defaultValue="dental" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="dental">Дентал Про (загрузка пациентов)</option>
                  <option value="full">Стандартный (полный)</option>
                </select>
              </div>
              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
                <Button type="submit" className="gap-2"><Download className="size-4" /> Выгрузить</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
