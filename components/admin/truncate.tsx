"use client"

import { useState } from "react"

// Сокращённый текст: ВСЕГДА в одну строку (высота не меняется). Полное название —
// подсказкой при наведении (desktop, нативный title) и всплывающим окошком при тапе (mobile).
export function Truncate({ text, width = "max-w-[150px]" }: { text: string; width?: string }) {
  const [open, setOpen] = useState(false)
  if (!text) return <span className="text-muted-foreground">—</span>
  return (
    <span className="relative inline-block align-middle">
      <span
        title={text}
        onClick={() => setOpen((o) => !o)}
        className={`block cursor-help truncate ${width}`}
      >
        {text}
      </span>
      {open && (
        <span
          onClick={() => setOpen(false)}
          className="absolute left-0 top-full z-20 mt-1 w-max max-w-xs rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  )
}
