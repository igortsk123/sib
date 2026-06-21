import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "sib — реестр гарантийных писем ДМС",
  description: "Сбор, распознавание и учёт гарантийных писем ДМС для медицинской клиники",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#6738DD",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
