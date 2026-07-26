import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { coverageChatMessage } from "@/lib/db/schema"

// Хранилище чата по правилам (владелец 26.07): история ОБЩАЯ на пациента в рамках клиники —
// «регистратура спрашивала и врач увидел, что спрашивала». В LLM каждый раз уходит контекст
// правил + накопленная история; в БД — все сообщения с автором.

export type ChatMessageDTO = {
  id: string
  role: "user" | "assistant"
  authorName: string | null
  content: string
  createdAt: string // ISO
}

const HISTORY_LIMIT = 100 // показываем в UI; в LLM уходит хвост (см. answer.ts)

export async function listChatMessages(orgId: string | null, patientKey: string): Promise<ChatMessageDTO[]> {
  if (orgId === "__none__") return []
  // ПОСЛЕДНИЕ N сообщений (desc+limit), затем разворот в хронологию —
  // иначе после 100 сообщений новые перестали бы попадать в UI и в LLM.
  const rows = await db()
    .select()
    .from(coverageChatMessage)
    .where(
      and(
        eq(coverageChatMessage.patientKey, patientKey),
        ...(orgId ? [eq(coverageChatMessage.organizationId, orgId)] : []),
      ),
    )
    .orderBy(desc(coverageChatMessage.createdAt))
    .limit(HISTORY_LIMIT)
  rows.reverse()
  return rows.map((r) => ({
    id: r.id,
    role: r.role === "assistant" ? "assistant" : "user",
    authorName: r.authorName,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function appendChatMessage(args: {
  orgId: string | null
  patientKey: string
  role: "user" | "assistant"
  authorName: string | null
  content: string
}): Promise<void> {
  await db().insert(coverageChatMessage).values({
    organizationId: args.orgId && args.orgId !== "__none__" ? args.orgId : null,
    patientKey: args.patientKey,
    role: args.role,
    authorName: args.authorName,
    content: args.content,
  })
}
