import { describe, expect, it } from "vitest"

import { composeGuaranteeRequest, encodeMimeHeader } from "./guarantee-request"

const base = {
  fullName: "Иванов Иван Иванович",
  birthDate: "1980-05-01",
  policyNumber: "Пр01234567",
  serviceText: "имплантация зуба 3.6",
  amount: 45000,
  clinicName: "ООО «Клиника «Сибирская»",
  lastEmail: {
    messageId: "<abc123@ingos.ru>",
    from: "dms@ingos.ru",
    subject: "Прикрепление по договору 220207/24",
  },
}

describe("composeGuaranteeRequest", () => {
  it("отвечает в тред: Re:-тема, In-Reply-To/References на письмо страховой", () => {
    const d = composeGuaranteeRequest(base)
    expect(d.subject).toBe("Re: Прикрепление по договору 220207/24")
    expect(d.inReplyTo).toBe("<abc123@ingos.ru>")
    expect(d.emlHeaders).toContain("In-Reply-To: <abc123@ingos.ru>")
    expect(d.emlHeaders).toContain("References: <abc123@ingos.ru>")
    expect(d.emlHeaders).toContain("To: dms@ingos.ru")
  })

  it("не дублирует Re: в уже-ответной теме", () => {
    const d = composeGuaranteeRequest({ ...base, lastEmail: { ...base.lastEmail, subject: "Re: полис" } })
    expect(d.subject).toBe("Re: полис")
  })

  it("без письма страховой — своя тема, без In-Reply-To, адрес пуст", () => {
    const d = composeGuaranteeRequest({ ...base, lastEmail: null })
    expect(d.subject).toContain("Запрос гарантийного письма")
    expect(d.inReplyTo).toBeNull()
    expect(d.emlHeaders).not.toContain("In-Reply-To")
    expect(d.to).toBe("")
  })

  it("тело содержит пациента, услугу и сумму; .eml помечен черновиком", () => {
    const d = composeGuaranteeRequest(base)
    expect(d.body).toContain("Иванов Иван Иванович")
    expect(d.body).toContain("01.05.1980")
    expect(d.body).toContain("имплантация зуба 3.6")
    expect(d.body).toContain("45 000 руб.")
    expect(d.body).toContain("Пр01234567")
    expect(d.emlHeaders.startsWith("X-Unsent: 1")).toBe(true)
  })

  it("без суммы строка стоимости не выводится; без полиса — «уточняется»", () => {
    const d = composeGuaranteeRequest({ ...base, amount: null, policyNumber: null })
    expect(d.body).not.toContain("стоимость")
    expect(d.body).toContain("Полис: уточняется")
  })
})

describe("encodeMimeHeader", () => {
  it("ASCII не трогает, кириллицу кодирует в RFC 2047 base64", () => {
    expect(encodeMimeHeader("Re: policy 123")).toBe("Re: policy 123")
    const enc = encodeMimeHeader("Запрос ГП")
    expect(enc).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/)
    expect(Buffer.from(enc.slice(10, -2), "base64").toString("utf-8")).toBe("Запрос ГП")
  })
})
