import type { Metadata } from "next"
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
  title: "DocON: stop losing money on unpaid insurance claims",
  description:
    "Insurance guarantee letters turn into a searchable registry straight from your clinic's mailbox. An AI assistant answers whether a service is covered. Works alongside your practice management system.",
  robots: { index: true, follow: true },
}

// Английская версия лендинга (владелец 26.07): автоматический выбор по локали браузера
// (см. /land — Accept-Language без ru ведёт сюда), цены в USD: реестр 150/250/400/500 $/мес,
// ИИ-помощник — те же суммы сверху. Структура зеркалит русскую v3.1.

const PAINS = [
  { icon: MailX, title: "Letters drown in the inbox", text: "Guarantee letters, enrollments and detachments get lost among newsletters and spam." },
  { icon: Clock, title: "15-25 minutes per letter", text: "Manual parsing and re-typing into your PMS eats hours of front-desk time every day." },
  { icon: ArchiveX, title: "Claim denied", text: "The service was provided, but there is no valid guarantee letter. The insurer does not pay." },
  { icon: UserX, title: "The patient walks away", text: "Waiting for approval, the patient never comes back to finish the treatment." },
]

const STEPS = [
  { n: "1", title: "Connect the mailbox", text: "The inbox where insurers write. Read-only: emails are never changed or deleted." },
  { n: "2", title: "The registry builds itself", text: "Names, policies, services, dates and limits are extracted from email bodies, PDF, Word and password-protected archives." },
  { n: "3", title: "Answer in seconds", text: "The front desk sees whether the insurer covers a service, if the letter is valid, and when to request a new one." },
]

function DemoBanner() {
  return (
    <a
      href="/demo"
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
    >
      <MonitorPlay className="size-6" aria-hidden /> View the live demo
    </a>
  )
}

export default function LandingPageEn() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-16 px-5 py-12">
      <header className="flex flex-col items-center gap-5 text-center">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Built for medical clinics
        </span>
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
          You treated the patient, the insurer never paid. Sound familiar?
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          DocON prevents unpaid insurance claims: insurer emails from your clinic&apos;s mailbox are
          collected into a clean registry, and an AI assistant answers in seconds whether a service
          is covered. Up and running in 7 days with any practice management system.
        </p>
        <DemoBanner />
        <ContactLinks />
        <a href="/land?lang=ru" className="text-xs text-muted-foreground underline underline-offset-2 hover:no-underline">
          Русская версия
        </a>
      </header>

      <section className="flex flex-col gap-5">
        <h2 className="text-center text-2xl font-semibold">How clinics lose money on insurance</h2>
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

      <section className="flex flex-col gap-5">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
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

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-2xl font-semibold">What you get</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Option 1</p>
          <h3 className="mt-1 text-xl font-semibold">A single registry of insurance letters</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [Inbox, "Every letter in one place", "Guarantee letters, enrollments, detachments, cancellations: from bodies, PDF, Word, archives."],
              [Zap, "Seconds instead of hours", "Your administrators take care of patients, not of parsing emails."],
              [FileSpreadsheet, "Easy import into your PMS", "Search by patient and policy, a card with originals, Excel export."],
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

        <div className="rounded-xl border-2 border-primary/40 bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Option 2</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <Bot className="size-5 text-primary" aria-hidden /> AI assistant for doctors and front desk
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask a question and get an answer based on the insurance rules of the specific patient, with the exact clause:
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {[
              ["Extraction of tooth 37", "Yes, covered under clause 2.12 of the program, including impacted teeth."],
              ["An implant for $500?", "Not included in the program (clause 5.2a). A guarantee letter is required; a draft is ready."],
              ["Second dental cleaning this year?", "The program covers one per year (clause 4.7). A repeat cleaning is out of pocket or upon insurer approval."],
            ].map(([q, a]) => (
              <div key={q} className="flex flex-col gap-1.5">
                <p className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">{q}</p>
                <p className="max-w-[85%] rounded-lg bg-muted px-3 py-1.5 text-sm">{a}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            In disputed cases the system drafts a guarantee letter request to the insurer and processes
            the reply when it arrives. Losses caused by mistakes go down to zero.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-2xl font-semibold">Pricing</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Insurance letters per month</th>
                <th className="py-2 pr-4 font-medium">Option 1. Registry</th>
                <th className="py-2 font-medium">+ Option 2. AI assistant</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["up to 100", "$150/mo", "+$150/mo"],
                ["up to 300", "$250/mo", "+$250/mo"],
                ["up to 600", "$400/mo", "+$400/mo"],
                ["up to 1,000", "$500/mo", "+$500/mo"],
              ].map(([n, a, b]) => (
                <tr key={n} className="border-b border-border/60">
                  <td className="py-2.5 pr-4">{n}</td>
                  <td className="py-2.5 pr-4 font-medium">{a}</td>
                  <td className="py-2.5 font-medium">{b}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 pr-4">more / clinic network</td>
                <td className="py-2.5 pr-4 font-medium" colSpan={2}>contact us</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            The letter volume is visible right in your registry, so the tier is easy to verify.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Setup and onboarding for the first clinics: free. A single unpaid claim often costs more
          than a month of subscription.
        </p>
      </section>

      <section className="flex gap-3 rounded-xl border border-border bg-card p-5">
        <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold">Data security</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Personal and medical data are handled with strict safeguards: the clinic&apos;s mailbox is
            accessed read-only, original letters live on a protected server, staff access is role-based.
          </p>
        </div>
      </section>

      <section className="flex flex-col items-center gap-5 rounded-xl border border-border bg-muted/30 p-8 text-center">
        <h2 className="text-2xl font-semibold">How many insurer letters did you get this month?</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Each of them is your clinic&apos;s money. Start with the demo on fictional data; then we connect
          your clinic&apos;s mailbox in read-only mode and show the registry on your own letters the next
          day. No PMS access, no software to install.
        </p>
        <DemoBanner />
        <p className="text-sm text-muted-foreground">Or message us directly, we reply fast:</p>
        <ContactLinks />
      </section>

      <footer className="flex flex-col items-center gap-2 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <p>Phones: +7-923-409-7976 · +7-923-407-9168</p>
        <p>Sole proprietor Yulia Shubina · OGRNIP 325420500121439 · INN 420221376189</p>
        <p>
          <a href="/land/privacy" className="underline">Privacy policy</a>
          {" · "}
          <a href="/land?lang=ru" className="underline">Русская версия</a>
        </p>
      </footer>
    </main>
  )
}
