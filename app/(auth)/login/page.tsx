import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/server/auth/session"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/")
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            D
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Doc.on</h1>
          <p className="text-sm text-muted-foreground">
            Гарантийные письма ДМС — вход для сотрудников клиники
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
