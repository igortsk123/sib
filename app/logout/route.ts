import { NextResponse } from "next/server"

import { destroySession } from "@/lib/server/auth/session"

// Запасной выход по прямой ссылке /logout — работает даже если меню/JS не отработали
// (например, клик в выпадающем меню закрыл его до отправки формы).
export async function GET(request: Request) {
  await destroySession()
  return NextResponse.redirect(new URL("/login", request.url))
}

export const POST = GET
