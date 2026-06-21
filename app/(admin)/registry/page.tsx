import { Inbox } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"

export default function RegistryPage() {
  return (
    <>
      <PageHeader
        title="Реестр гарантийных писем"
        description="Единая база ГП с поиском по пациенту, полису, страховой и экспортом в Excel."
      />
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <Inbox className="size-10 text-muted-foreground" aria-hidden />
        <div className="text-sm font-medium">Данные появятся после подключения почты</div>
        <p className="max-w-md text-sm text-muted-foreground">
          Дальше подключим почтовые ящики клиники: письма страховых будут автоматически
          распознаваться (тело, PDF, Excel, архивы) и попадать сюда — с поиском и выгрузкой в Excel.
        </p>
      </Card>
    </>
  )
}
