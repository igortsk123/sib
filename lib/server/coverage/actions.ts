"use server"

import { z } from "zod"

import { resolveRegistryScope } from "@/lib/server/scope"

import { answerCoverageQuestion } from "./answer"
import type { CoverageAnswer } from "./answer-core"

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
