import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Inbox, FileSearch, Table2, ShieldCheck } from "lucide-react"

const CAPABILITIES = [
  { icon: Inbox, title: "Забор писем", desc: "IMAP/Яндекс, двойная пересылка, дедупликация" },
  { icon: FileSearch, title: "Распознавание", desc: "тело, PDF, Word, архив+пароль, OCR, поля + confidence" },
  { icon: Table2, title: "Реестр + Excel", desc: "поиск по пациенту/полису/страховой, экспорт" },
  { icon: ShieldCheck, title: "Роли и доступ", desc: "RBAC, аудит-лог, ПДн/мед.тайна" },
]

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">до-MVP · каркас</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          sib — агрегатор гарантийных писем ДМС
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Автоматически собирает письма страховых из почтовых ящиков клиники, распознаёт их и сводит
          в единый проверяемый реестр с поиском и экспортом в Excel.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="size-6 text-primary" aria-hidden />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">скоро</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
