import type { Metadata } from "next"

import { ContactLinks } from "@/components/landing/contact-links"
import { LeadForm } from "@/components/landing/lead-form"

export const metadata: Metadata = {
  title: "сиб — реестр гарантийных писем ДМС из почты клиники",
  description:
    "Автоматический реестр гарантийных писем ДМС из почты клиники. Контроль согласований, лимитов и риска неоплаты. Работает вместе с вашей МИС.",
  robots: { index: true, follow: true },
}

// Публичный лендинг для рекламы (план ads-b2b-semantics-review). Первый экран — квалификатор
// «для клиник» (пациент не должен конвертироваться: интент-фильтр из domain/demand-semantics.md).
export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-14 px-5 py-12">
      <header className="flex flex-col gap-5">
        <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Сервис для медицинских клиник — не для пациентов
        </span>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          Гарантийные письма ДМС из почты клиники — сами превращаются в проверяемый реестр
        </h1>
        <p className="text-lg text-muted-foreground">
          ДМС-модуль к вашей МИС: подключаете почту — письма страховых (гарантийные, прикрепления,
          открепления) распознаются и сводятся в реестр. Контроль согласований, сроков, лимитов
          и риска неоплаты. МИС менять не нужно.
        </p>
        <ContactLinks />
        <a
          href="/demo"
          className="w-fit rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Открыть живое демо-реестра (вымышленные данные) →
        </a>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Подключаете почту", "Ящик, куда пишут страховые. Только чтение — письма не трогаем."],
          ["2. Реестр строится сам", "ФИО, полис, услуги, сроки, лимиты — из тела, PDF, Word, архивов с паролем."],
          ["3. Ответ за секунды", "Регистратура видит: покроет ли страховая услугу пациенту и надо ли запросить ГП."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Что болит без реестра</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
          <li>Письма страховых разбросаны по почте, учёт — вручную в Excel.</li>
          <li>Оказали услугу без действующего гарантийного письма — счёт не оплатят.</li>
          <li>Регистратура тратит часы на «покрывает ли полис» и звонки в страховые.</li>
          <li>Прикрепления и открепления теряются — пациент «числится», а оплата не придёт.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Безопасность данных</h2>
        <p className="text-muted-foreground">
          Персональные и медицинские данные обрабатываются по 152-ФЗ: почта клиники — строго в режиме
          чтения, оригиналы писем хранятся на защищённом сервере, доступ сотрудников — по ролям.
          Никакой рекламы пациентам и передачи данных третьим лицам.
        </p>
      </section>

      <section id="lead" className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="text-xl font-semibold">Демо на данных вашей клиники — за 1 день</h2>
        <p className="text-sm text-muted-foreground">
          Быстрее всего — написать напрямую (Telegram/WhatsApp/MAX выше). Или оставьте контакт —
          свяжемся сами:
        </p>
        <LeadForm />
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
        <ContactLinks compact />
        <p>ИП Шубина Юлия Александровна · ОГРНИП 325420500121439 · ИНН 420221376189</p>
        <p>
          <a href="/land/privacy" className="underline">Политика конфиденциальности</a>
        </p>
      </footer>
    </main>
  )
}
