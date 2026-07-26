"use server"

import { z } from "zod"

import { db } from "@/lib/db"
import { lead } from "@/lib/db/schema"
import { log } from "@/lib/log"

// Заявка с публичного лендинга (без авторизации). Антиспам: honeypot-поле «website»
// (люди его не видят и не заполняют) + мягкий лимит длины. SMTP-уведомлений нет (read-only
// правило почты) — заявки видны в БД; алерт в логе.

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  clinic: z.string().trim().max(200).optional().default(""),
  contact: z.string().trim().min(5).max(200),
  comment: z.string().trim().max(1000).optional().default(""),
  website: z.string().max(0).optional().default(""), // honeypot: боты заполняют — отбрасываем
  utm: z.record(z.string(), z.string().max(200)).optional().default({}),
})

export type LeadResult = { ok: true } | { ok: false; error: string }

export async function createLead(input: unknown): Promise<LeadResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Заполните имя (от 2 символов) и контакт (телефон или email)" }
  }
  if (parsed.data.website) return { ok: true } // honeypot-бот: делаем вид, что приняли
  try {
    await db().insert(lead).values({
      name: parsed.data.name,
      clinic: parsed.data.clinic || null,
      contact: parsed.data.contact,
      comment: parsed.data.comment || null,
      utm: parsed.data.utm,
    })
    log.info("landing_lead_created", { hasClinic: Boolean(parsed.data.clinic) })
    return { ok: true }
  } catch (e) {
    log.error("landing_lead_failed", { error: String(e).slice(0, 200) })
    return { ok: false, error: "Не получилось отправить — напишите нам в Telegram" }
  }
}
