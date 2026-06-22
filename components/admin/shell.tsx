"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Building2,
  FileText,
  LogOut,
  Menu,
  MessageSquareWarning,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logout } from "@/lib/server/auth/actions"

export type NavRole = "platform" | "owner" | "staff"

export type ShellUser = { name: string | null; phone: string; roleLabel: string }

type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean }

function navFor(role: NavRole): NavItem[] {
  const insurers: NavItem = { href: "/insurers", label: "Страховые", icon: ShieldCheck }
  const registry: NavItem = { href: "/registry", label: "Реестр ГП", icon: FileText, primary: true }
  const parselog: NavItem = { href: "/parse-log", label: "Журнал разбора", icon: Activity }
  const reports: NavItem = { href: "/error-reports", label: "Сообщения об ошибках", icon: MessageSquareWarning }
  if (role === "platform")
    return [
      { href: "/admin/clinics", label: "Клиники", icon: Building2, primary: true },
      { ...registry, primary: true },
      { ...insurers, primary: true },
      parselog,
      reports,
    ]
  if (role === "owner")
    return [
      { ...registry, primary: true },
      { href: "/staff", label: "Сотрудники", icon: Users, primary: true },
      { ...insurers, primary: true },
      parselog,
    ]
  return [
    { ...registry, primary: true },
    { ...insurers, primary: true },
  ]
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/")
        const Icon = it.icon
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-1 py-1">
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
        D
      </span>
      <span className="font-semibold tracking-tight">Doc.on</span>
    </Link>
  )
}

export function AdminShell({
  user,
  role,
  children,
}: {
  user: ShellUser
  role: NavRole
  children: React.ReactNode
}) {
  const items = navFor(role)
  const [open, setOpen] = useState(false)
  const initials = (user.name ?? user.phone).slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Brand />
        <NavLinks items={items} />
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card px-4 md:pl-64">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Меню">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetTitle className="sr-only">Навигация</SheetTitle>
            <div className="mb-4">
              <Brand />
            </div>
            <NavLinks items={items} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="md:hidden">
          <Brand />
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user.name ?? user.phone}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user.name ?? "Без имени"}</div>
                <div className="text-xs text-muted-foreground">{user.phone}</div>
                <div className="mt-1 text-xs text-primary">{user.roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form action={logout}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full">
                    <LogOut className="size-4" /> Выйти
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 py-6 pb-24 md:pl-64 md:pb-6">
        {/* Широкий контейнер: реестр — 9 колонок, max-w-6xl был узок (колонка «Дата» уезжала). */}
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card md:hidden">
        {items
          .filter((i) => i.primary)
          .slice(0, 4)
          .map((it) => {
            const Icon = it.icon
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground"
              >
                <Icon className="size-5" aria-hidden />
                {it.label}
              </Link>
            )
          })}
      </nav>
    </div>
  )
}
