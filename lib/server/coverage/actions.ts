"use server"

import { z } from "zod"

import { patientCard } from "@/lib/server/patients/queries"
import { resolveRegistryScope } from "@/lib/server/scope"

import { answerCoverageQuestion } from "./answer"
import type { CoverageAnswer } from "./answer-core"
import {
  clinicName,
  composeGuaranteeRequest,
  lastInsurerEmail,
  type GuaranteeRequestDraft,
} from "./guarantee-request"

// Server action «спросить про покрытие» — доступен любому вошедшему сотруднику
// (врач и регистратура — равноправные пользователи, core/coverage-assistant-vision.md).

const Input = z.object({
  patientKey: z.string().regex(/^[0-9a-f]{24}$/),
  serviceText: z.string().trim().min(3).max(300),
  amount: z.union([z.number().int().positive().max(10_000_000), z.null()]),
})

export type AskCoverageResult =
  | { ok: true; answer: CoverageAnswer & { patientFound: boolean } }
  | { ok: false; error: string }

export async function askCoverage(input: unknown): Promise<AskCoverageResult> {
  const scope = await resolveRegistryScope()
  if (!scope.user) return { ok: false, error: "Нужно войти в систему" }
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Заполните услугу (от 3 символов); сумма — целое число" }
  try {
    const answer = await answerCoverageQuestion({
      patientKey: parsed.data.patientKey,
      orgId: scope.orgId,
      serviceText: parsed.data.serviceText,
      amount: parsed.data.amount,
    })
    return { ok: true, answer }
  } catch {
    return { ok: false, error: "Не удалось получить ответ — попробуйте ещё раз" }
  }
}

export type GuaranteeDraftResult =
  | { ok: true; draft: GuaranteeRequestDraft }
  | { ok: false; error: string }

// Черновик запроса ГП (Ф-D): reply-in-thread на последнее письмо страховой по пациенту.
// Системной отправки НЕТ (почта строго read-only) — сотрудник копирует/скачивает .eml.
export async function guaranteeRequestDraft(input: unknown): Promise<GuaranteeDraftResult> {
  const scope = await resolveRegistryScope()
  if (!scope.user) return { ok: false, error: "Нужно войти в систему" }
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Заполните услугу (от 3 символов)" }
  try {
    const card = await patientCard(parsed.data.patientKey, scope.orgId)
    if (!card) return { ok: false, error: "Пациент не найден" }
    const lastEmail = await lastInsurerEmail(parsed.data.patientKey, scope.orgId, card.state.insuranceCompanyId)
    const draft = composeGuaranteeRequest({
      fullName: card.fullName,
      birthDate: card.birthDate,
      policyNumber: card.policyNumber,
      serviceText: parsed.data.serviceText,
      amount: parsed.data.amount,
      clinicName: await clinicName(scope.orgId),
      lastEmail,
    })
    return { ok: true, draft }
  } catch {
    return { ok: false, error: "Не удалось собрать черновик — попробуйте ещё раз" }
  }
}
