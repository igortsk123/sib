"use client"

import { useState } from "react"

// Сокращённый текст с подсказкой полного: наведение (desktop, title) + клик/тап (mobile, раскрытие).
export function Truncate({ text, width = "max-w-[150px]" }: { text: string; width?: string }) {
  const [open, setOpen] = useState(false)
  if (!text) return <span className="text-muted-foreground">—</span>
  return (
    <span
      title={text}
      onClick={() => setOpen((o) => !o)}
      className={`block cursor-help ${open ? "whitespace-normal" : `truncate ${width}`}`}
    >
      {text}
    </span>
  )
}
