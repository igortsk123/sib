import { readFile } from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { simpleParser } from "mailparser"

import { db } from "@/lib/db"
import { attachment, emailMessage } from "@/lib/db/schema"
import { requireUser } from "@/lib/server/auth/guards"
import { CONTENT_TYPES, resolveStoragePath } from "@/lib/storage"

// Защищённая раздача оригиналов (ПДн → только по сессии). kind: email | attachment.
// Письмо по умолчанию рендерится ЧИТАЕМО (тело письма); сырой .eml — через ?raw=1.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const auth = await requireUser()
  if (!auth.ok) return new Response("Unauthorized", { status: 401 })
  const { kind, id } = await params
  const raw = new URL(req.url).searchParams.get("raw") === "1"

  if (kind === "email") {
    const rows = await db().select().from(emailMessage).where(eq(emailMessage.id, id)).limit(1)
    const rel = rows[0]?.rawStoragePath ?? null
    if (!rel) return new Response("Not found", { status: 404 })
    const full = resolveStoragePath(rel)
    if (!full) return new Response("Forbidden", { status: 403 })
    let data: Buffer
    try {
      data = await readFile(full)
    } catch {
      return new Response("File missing", { status: 404 })
    }
    if (raw) {
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": "message/rfc822",
          "Content-Disposition": `attachment; filename="${id}.eml"`,
          "Cache-Control": "private, no-store",
        },
      })
    }
    // Читаемый вид: парсим письмо и рендерим тело.
    const parsed = await simpleParser(data)
    const body = parsed.html ? sanitizeHtml(parsed.html) : textToHtml(parsed.text ?? "")
    const page = emailPage(
      {
        from: parsed.from?.text ?? "",
        subject: parsed.subject ?? "",
        date: parsed.date ? parsed.date.toLocaleString("ru") : "",
      },
      body,
    )
    return new Response(page, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    })
  }

  if (kind === "attachment") {
    const rows = await db().select().from(attachment).where(eq(attachment.id, id)).limit(1)
    const rel = rows[0]?.storagePath ?? null
    const filename = rows[0]?.filename ?? id
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

  return new Response("Not found", { status: 404 })
}

// Базовая очистка HTML письма (доверенный корпус, но убираем активный контент).
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
}

function textToHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<pre style="white-space:pre-wrap;font-family:inherit">${esc}</pre>`
}

function emailPage(meta: { from: string; subject: string; date: string }, body: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Оригинал письма</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f5f5fc;color:#373742}
.hd{background:#fff;border-bottom:1px solid #e5e5f1;padding:12px 16px;font-size:13px}
.hd b{color:#000}.bd{padding:16px;max-width:900px;margin:0 auto}.bd img{max-width:100%;height:auto}</style>
</head><body>
<div class="hd"><div><b>От:</b> ${esc(meta.from)}</div><div><b>Тема:</b> ${esc(meta.subject)}</div><div><b>Дата:</b> ${esc(meta.date)}</div></div>
<div class="bd">${body}</div>
</body></html>`
}
