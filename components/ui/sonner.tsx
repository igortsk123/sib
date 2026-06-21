"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * App-wide toast container.
 *
 * Tuning vs. shadcn defaults:
 * - position: top-right on desktop, top-center on mobile (better visibility,
 *   bottom-right часто игнорируется как "уведомление от ОС").
 * - Per-intent: 4px accent stripe слева + tinted bg (success / error / warning / info).
 * - Per-intent icons использует semantic токены (text-success / -destructive / ...).
 * - Max 3 visible at once, остальные в очереди (предотвращает stacking spam).
 * - Default duration 4s — для warning/error передавать `{ duration: 6000 | 8000 }` per-call.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const isMobile = useIsMobile()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={isMobile ? "top-center" : "top-right"}
      visibleToasts={3}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-primary" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast border border-border bg-popover text-popover-foreground shadow-lg backdrop-blur-sm",
          title: "font-semibold text-sm",
          description: "text-sm text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton:
            "bg-popover border-border text-popover-foreground hover:bg-muted",
          // Per-intent tinted bg + 4px accent stripe слева
          success: "border-l-4 border-l-success bg-success/5",
          error: "border-l-4 border-l-destructive bg-destructive/5",
          warning: "border-l-4 border-l-warning bg-warning/5",
          info: "border-l-4 border-l-primary bg-primary/5",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
