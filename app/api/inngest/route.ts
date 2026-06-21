import { serve } from "inngest/next"

import { inngest } from "@/lib/inngest/client"
import { functions } from "@/lib/inngest/functions"

// Эндпоинт Inngest (App Router). Регистрирует функции, обрабатывает вызовы/ретраи.
export const { GET, POST, PUT } = serve({ client: inngest, functions })
