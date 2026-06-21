import { readFile } from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { attachment, emailMessage } from "@/lib/db/schema"
import { requireUser } from "@/lib/server/auth/guards"
import { CONTENT_TYPES, resolveStoragePath } from "@/lib/storage"

// Защищённая раздача оригиналов (ПДн → только по сессии). kind: email | attachment.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const auth = await requireUser()
  if (!auth.ok) return new Response("Unauthorized", { status: 401 })
  const { kind, id } = await params

  let rel: string | null = null
  let filename = "original"
  if (kind === "email") {
    const rows = await db().select().from(emailMessage).where(eq(emailMessage.id, id)).limit(1)
    rel = rows[0]?.rawStoragePath ?? null
    filename = `${id}.eml`
  } else if (kind === "attachment") {
    const rows = await db().select().from(attachment).where(eq(attachment.id, id)).limit(1)
    rel = rows[0]?.storagePath ?? null
    filename = rows[0]?.filename ?? `${id}`
  } else {
    return new Response("Not found", { status: 404 })
  }
  if (!rel) return new Response("Not found", { status: 404 })

  const full = resolveStoragePath(rel)
  if (!full) return new Response("Forbidden", { status: 403 })
  let data: Buffer
  try {
    data = await readFile(full)
  } catch {
    return new Response("File missing", { status: 404 })
  }
  const ext = path.extname(full).slice(1).toLowerCase()
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  })
}
