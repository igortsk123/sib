import type { Metadata } from "next"

import { ContactLinks } from "@/components/landing/contact-links"

export const metadata: Metadata = {
  title: "сиб — перестаньте терять деньги на невыплатах ДМС",
  description:
    "Гарантийные письма страховых сами превращаются в реестр из почты клиники. ИИ-помощник отвечает, покроет ли страховая услугу. Работает вместе с вашей МИС.",
  robots: { index: true, follow: true },
}

// Лендинг v2 (владелец 26.07): фокус — ДЕНЬГИ (невыплаты ДМС), две прозрачные опции, тарифы
// по письмам, БЕЗ формы заявки (минимум трений: прямые контакты + живое демо).
// Формулировки болей — из открытых кейсов рынка (15–25 мин/письмо вручную, отказы страховых
// без вовремя прикреплённого ГП, письма теряются среди спама).
export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-14 px-5 py-12">
      <header className="flex flex-col gap-5">
        <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Сервис для медицинских клиник — не для пациентов
        </span>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          Перестаньте терять деньги на невыплатах ДМС
        </h1>
        <p className="text-lg text-muted-foreground">
          Оказали услугу без действующего гарантийного письма — страховая не заплатит. сиб собирает
          письма страховых из почты клиники в единый реестр и отвечает регистратуре за секунды:
          покроет ли страховая услугу и нужно ли запросить ГП. Работает вместе с вашей МИС.
        </p>
        <ContactLinks />
        <a
          href="/demo"
          className="w-fit rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Открыть живое демо-реестра (данные вымышлены) →
        </a>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Как клиники теряют деньги на ДМС</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
          <li>На одно гарантийное письмо вручную уходит 15–25 минут; поток — сотни писем в месяц.</li>
          <li>Письма теряются в почте среди рассылок и спама; перенос в МИС растягивается на часы и дни.</li>
          <li>Нет вовремя прикреплённого гарантийного письма — страховая отказывает в оплате уже оказанной услуги.</li>
          <li>Пациент, не дождавшийся согласования, уходит и не возвращается за продолжением лечения.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Две опции — прозрачно</h2>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Опция 1</p>
          <h3 className="mt-1 text-lg font-semibold">Единый реестр писем ДМС</h3>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>Все письма страховых (гарантийные, прикрепления, открепления, аннулирования) — сами
                собираются из почты в единую систему: тело письма, PDF, Word, архивы с паролем.</li>
            <li>Обработка письма — секунды вместо 15–25 минут; администраторы занимаются пациентами,
                а не рутиной.</li>
            <li>Поиск по пациенту/полису/страховой, карточка со всеми источниками, выгрузка в Excel —
                удобный импорт в вашу МИС.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-primary/40 bg-card p-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Опция 2</p>
          <h3 className="mt-1 text-lg font-semibold">ИИ-помощник врача и регистратуры</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Любой вопрос — ответ на основе правил страховой конкретного застрахованного, с пунктом документа:
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li className="rounded-md bg-muted/50 p-2">
              «Удаление зуба 3.7 пациенту с полисом СОГАЗ?» → <b>«Да, покрыто — п. 2.12 программы,
              включая ретинированные зубы»</b>
            </li>
            <li className="rounded-md bg-muted/50 p-2">
              «Имплантация за 45 000 ₽?» → <b>«Не входит в программу (п. 5.2а) — нужно запросить
              гарантийное письмо»</b>
            </li>
            <li className="rounded-md bg-muted/50 p-2">
              «Лечение кариеса, пациент был у нас в марте?» → <b>«Пациент откреплён с 12.05 —
              оплата по ДМС не гарантируется»</b>
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            В спорных случаях система сама составит запрос гарантийного письма в страховую и обработает
            ответ по приходу. Невыплаты из-за «оказали без ГП» сводятся к нулю.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Стоимость — по объёму писем</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Писем ДМС в месяц</th>
                <th className="py-2 pr-4 font-medium">Опция 1 · Реестр</th>
                <th className="py-2 font-medium">+ Опция 2 · ИИ-помощник</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">до 300</td>
                <td className="py-2 pr-4">10 000 ₽/мес</td>
                <td className="py-2">+10 000 ₽/мес</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">до 1 000</td>
                <td className="py-2 pr-4">15 000 ₽/мес</td>
                <td className="py-2">+10 000 ₽/мес</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">свыше 1 000 / сеть клиник</td>
                <td className="py-2 pr-4" colSpan={2}>индивидуально — напишите нам</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Подключение и настройка для первых клиник — 0 ₽ (пилотная цена фиксируется на 12 месяцев).
          Одна невыплата страховой обычно дороже месяца подписки.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Безопасность данных</h2>
        <p className="text-muted-foreground">
          Персональные и медицинские данные обрабатываются по 152-ФЗ: почта клиники — строго в режиме
          чтения, оригиналы писем хранятся на защищённом сервере, доступ сотрудников — по ролям.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="text-xl font-semibold">Посмотрите сами — живое демо</h2>
        <p className="text-sm text-muted-foreground">
          Реестр, карточки пациентов и ИИ-помощник на вымышленных данных. Понравится — напишите,
          подключим вашу почту и покажем то же самое на письмах вашей клиники за 1 день.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/demo"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Открыть демо →
          </a>
          <ContactLinks compact />
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
        <ContactLinks compact />
        <p>Телефоны: +7-923-409-7976 · +7-923-407-9168</p>
        <p>ИП Шубина Юлия Александровна · ОГРНИП 325420500121439 · ИНН 420221376189</p>
        <p>
          <a href="/land/privacy" className="underline">Политика конфиденциальности</a>
        </p>
      </footer>
    </main>
  )
}
