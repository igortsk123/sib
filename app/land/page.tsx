import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  ArchiveX,
  Bot,
  Clock,
  FileSpreadsheet,
  Inbox,
  MailX,
  MonitorPlay,
  ShieldCheck,
  UserX,
  Zap,
} from "lucide-react"

import { ContactLinks } from "@/components/landing/contact-links"

export const metadata: Metadata = {
  title: "DocON: перестаньте терять деньги на невыплатах ДМС",
  description:
    "Гарантийные письма страховых сами превращаются в реестр из почты клиники. ИИ-помощник отвечает, покроет ли страховая услугу. Работает вместе с вашей МИС.",
  robots: { index: true, follow: true },
}

// Продающая структура (владелец 26.07 + разбор практик B2B-лендингов): hero с одним оффером,
// карточные блоки, шаги, диалог-примеры ИИ, тарифы, финальный CTA.
// v3.1 (правки владельца 26.07): всё центрировано (на десктопе было «не оч»), демо — заметный
// баннер «Посмотреть демо-версию», блок цифр убран, контакты один раз (финальный блок; в футере
// только телефоны текстом), акценты контактов равнозначные, англ-версия /land/en с автоопределением
// локали браузера (Accept-Language без ru → редирект). Только семантические токены темы (ui-rules).

const PAINS = [
  { icon: MailX, title: "Письма тонут в почте", text: "Гарантийные письма, прикрепления и открепления теряются среди рассылок и спама." },
  { icon: Clock, title: "15-25 минут на письмо", text: "Ручной разбор и перенос в МИС занимают часы работы регистратуры каждый день." },
  { icon: ArchiveX, title: "14-18% счетов с отказом", text: "Столько отказов и недоплат по ДМС получают клиники без системного учёта писем: выставили 3 100 ₽, оплатили 2 100 ₽." },
  { icon: UserX, title: "Пациент уходит", text: "Не дождавшись согласования, пациент не возвращается за продолжением лечения." },
]

const STEPS = [
  { n: "1", title: "Подключаете почту", text: "Ящик, куда пишут страховые. Только чтение: письма не изменяются и не удаляются." },
  { n: "2", title: "Реестр строится сам", text: "ФИО, полис, услуги, сроки и лимиты берутся из тела письма, PDF, Word и архивов с паролем." },
  { n: "3", title: "Отвечаете за секунды", text: "Регистратура видит: покроет ли страховая услугу, действует ли письмо, надо ли запросить новое." },
]

function DemoBanner() {
  // Демо — главный CTA (владелец 26.07: «выдели это как баннер, это важно»)
  return (
    <a
      href="/demo"
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
    >
      <MonitorPlay className="size-6" aria-hidden /> Посмотреть демо-версию
    </a>
  )
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  // Автовыбор языка: браузер без русского → английская версия (цены в USD).
  // ?lang=ru — явный выбор с англ. страницы, автоперенаправление не срабатывает (иначе цикл).
  const { lang } = await searchParams
  const accept = (await headers()).get("accept-language") ?? ""
  if (lang !== "ru" && accept && !accept.toLowerCase().includes("ru")) redirect("/land/en")

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-16 px-5 py-12">
      {/* HERO: один оффер, демо-баннер, прямые контакты */}
      <header className="flex flex-col items-center gap-5 text-center">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Сервис для медицинских клиник
        </span>
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
          Оказали услугу пациенту, а страховая не заплатила. Знакомо?
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          DocON предотвращает невыплаты ДМС: письма страховых из почты клиники собираются
          в удобный реестр, а ИИ-помощник за секунды отвечает, покроет ли страховая услугу.
          Запуск за 7 дней с любой МИС.
        </p>
        <DemoBanner />
        <ContactLinks />
        <a href="/land/en" className="text-xs text-muted-foreground underline underline-offset-2 hover:no-underline">
          English version
        </a>
      </header>

      {/* Боли */}
      <section className="flex flex-col gap-5">
        <h2 className="text-center text-2xl font-semibold">Как клиники теряют деньги на ДМС</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PAINS.map((p) => (
            <div key={p.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <p.icon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Отраслевой факт */}
      <section className="rounded-xl border border-primary/40 bg-muted/30 p-5">
        <p className="text-lg font-medium">
          Отраслевой ориентир: системная работа с гарантийными письмами снижает долю отказов
          страховых с 14-18% до 5-7% счетов. Бывает и хуже: у одной стоматологии 1 800 визитов
          по ДМС принесли меньше денег, чем 400 платных.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          DocON делает эту системную работу автоматически: ни одно письмо не теряется, сроки и
          лимиты под контролем, спорные случаи уходят запросом в страховую до оказания услуги.
        </p>
      </section>

      {/* Как работает */}
      <section className="flex flex-col gap-5">
        <h2 className="text-center text-2xl font-semibold">Как это работает</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card p-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {s.n}
              </span>
              <p className="mt-3 font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ОПЦИЯ 1 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-center text-2xl font-semibold">Что вы получаете</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Опция 1</p>
          <h3 className="mt-1 text-xl font-semibold">Единый реестр писем ДМС</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [Inbox, "Все письма в одной системе", "Гарантийные, прикрепления, открепления, аннулирования: из тела, PDF, Word, архивов."],
              [Zap, "Секунды вместо часов", "Администраторы занимаются пациентами, а не разбором почты."],
              [FileSpreadsheet, "Удобный импорт в МИС", "Поиск по пациенту и полису, карточка с оригиналами, выгрузка в Excel."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Inbox
              return (
                <div key={t as string} className="rounded-lg bg-muted/40 p-3">
                  <I className="size-5 text-primary" aria-hidden />
                  <p className="mt-2 text-sm font-medium">{t as string}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d as string}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Опция 2 */}
        <div className="rounded-xl border-2 border-primary/40 bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Опция 2</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <Bot className="size-5 text-primary" aria-hidden /> ИИ-помощник врача и регистратуры
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Задаёте вопрос и получаете ответ по правилам страховой конкретного пациента, с пунктом документа:
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {[
              ["Удаление зуба 37", "Да, покрыто по п. 2.12 программы, включая ретинированные зубы."],
              ["Имплантация за 45 000 ₽?", "Не входит в программу (п. 5.2а). Нужно запросить гарантийное письмо, черновик уже готов."],
              ["Профгигиена второй раз за год?", "По программе — 1 раз в год (п. 4.7). Повторная чистка платно или по согласованию со страховой."],
            ].map(([q, a]) => (
              <div key={q} className="flex flex-col gap-1.5">
                <p className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">{q}</p>
                <p className="max-w-[85%] rounded-lg bg-muted px-3 py-1.5 text-sm">{a}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            В спорных случаях система сама составит запрос гарантийного письма в страховую и обработает
            ответ по приходу. Невыплаты из-за ошибок сводятся к нулю.
          </p>
        </div>
      </section>

      {/* ТАРИФЫ */}
      <section className="flex flex-col gap-4">
        <h2 className="text-center text-2xl font-semibold">Сколько стоит</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Писем ДМС в месяц</th>
                <th className="py-2 pr-4 font-medium">Опция 1. Реестр</th>
                <th className="py-2 font-medium">+ Опция 2. ИИ-помощник</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["до 100", "5 000 ₽/мес", "+5 000 ₽/мес"],
                ["до 300", "10 000 ₽/мес", "+10 000 ₽/мес"],
                ["до 600", "15 000 ₽/мес", "+15 000 ₽/мес"],
                ["до 1 000", "20 000 ₽/мес", "+20 000 ₽/мес"],
              ].map(([n, a, b]) => (
                <tr key={n} className="border-b border-border/60">
                  <td className="py-2.5 pr-4">{n}</td>
                  <td className="py-2.5 pr-4 font-medium">{a}</td>
                  <td className="py-2.5 font-medium">{b}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 pr-4">больше / сеть клиник</td>
                <td className="py-2.5 pr-4 font-medium" colSpan={2}>напишите нам</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Объём писем виден в вашем же реестре, так что тариф легко проверить.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Подключение и настройка для первых клиник: 0 ₽. Одна невыплата страховой часто дороже
          месяца подписки.
        </p>
      </section>

      {/* БЕЗОПАСНОСТЬ */}
      <section className="flex gap-3 rounded-xl border border-border bg-card p-5">
        <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold">Безопасность данных</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Персональные и медицинские данные обрабатываются по 152-ФЗ: почта клиники строго в режиме чтения,
            оригиналы писем на защищённом сервере, доступ сотрудников по ролям.
          </p>
        </div>
      </section>

      {/* ФИНАЛЬНЫЙ CTA: демо + прямые контакты (единственное место с контактами, чтобы не дублировать футер) */}
      <section className="flex flex-col items-center gap-5 rounded-xl border border-border bg-muted/30 p-8 text-center">
        <h2 className="text-2xl font-semibold">Сколько писем страховых пришло вам за месяц?</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Каждое из них — это деньги клиники. Начните с демо-версии на вымышленных данных, а дальше
          подключим ящик вашей клиники в режиме «только чтение» и покажем реестр на ваших письмах
          уже на следующий день. Ни доступа в МИС, ни установки на компьютеры не нужно.
        </p>
        <DemoBanner />
        <p className="text-sm text-muted-foreground">Или напишите напрямую, ответим быстро:</p>
        <ContactLinks />
      </section>

      <footer className="flex flex-col items-center gap-2 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <p>Телефоны: +7-923-409-7976 · +7-923-407-9168</p>
        <p>ИП Шубина Юлия Александровна · ОГРНИП 325420500121439 · ИНН 420221376189</p>
        <p>
          <a href="/land/privacy" className="underline">Политика конфиденциальности</a>
          {" · "}
          <a href="/land/en" className="underline">English</a>
        </p>
      </footer>
    </main>
  )
}
