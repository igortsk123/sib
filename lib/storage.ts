import "server-only"
import path from "node:path"

// Хранилище оригиналов (ПДн) — на сервере, вне git. В контейнере смонтировано как /app/storage
// (том /opt/sib-storage). Локально — ./storage. В БД храним ОТНОСИТЕЛЬНЫЙ путь (emails/<id>.eml).
export const STORAGE_DIR = process.env.STORAGE_DIR || (process.env.NODE_ENV === "production" ? "/app/storage" : "./storage")

// Защита от path traversal: разрешаем только относительные пути внутри STORAGE_DIR.
export function resolveStoragePath(rel: string): string | null {
  const full = path.resolve(STORAGE_DIR, rel)
  const base = path.resolve(STORAGE_DIR)
  if (full !== base && !full.startsWith(base + path.sep)) return null
  return full
}

export const CONTENT_TYPES: Record<string, string> = {
  eml: "message/rfc822",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  rtf: "application/rtf",
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
}
