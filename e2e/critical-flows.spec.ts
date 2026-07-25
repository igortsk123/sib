import { expect, test } from "@playwright/test"

// Критические потоки (конституция §3): вход → реестр → пациенты → вопрос-ответ →
// правила покрытия → выход. Данные — вымышленные фикстуры (e2e/fixtures.ts).

// Сессия — из e2e/auth.setup.ts (storageState): вход выполняется один раз на прогон.

test("реестр писем ДМС открывается и ищет", async ({ page }) => {
  await page.goto("/registry")
  await expect(page.getByRole("heading", { name: "Реестр писем ДМС" })).toBeVisible()
  await expect(page.getByRole("table")).toBeVisible()
  const search = page.getByPlaceholder(/поиск|фамилия|пациент/i).first()
  await search.fill("Тестов")
  await search.press("Enter")
  await expect(page.getByRole("table")).toBeVisible() // поиск не роняет страницу
})

test("пациенты: список → карточка → «что действует сейчас»", async ({ page }) => {
  await page.goto("/patients")
  await expect(page.getByRole("heading", { name: "Пациенты" })).toBeVisible()
  await page.getByRole("link", { name: /Тестов Пациент/ }).first().click()
  await page.waitForURL(/\/patients\/[0-9a-f]{24}/)
  await expect(page.getByText("Что действует сейчас").first()).toBeVisible()
  await expect(page.getByText("прикреплён", { exact: false }).first()).toBeVisible()
  await expect(page.getByText("Действующие гарантийные письма").first()).toBeVisible()
})

test("вопрос «можно ли делать»: покрыто / исключено / по письму", async ({ page }) => {
  await page.goto("/patients")
  await page.getByRole("link", { name: /Тестов Пациент/ }).first().click()
  await page.waitForURL(/\/patients\/[0-9a-f]{24}/)

  const service = page.getByPlaceholder(/Услуга/)
  const check = page.getByRole("button", { name: "Проверить" })

  await service.fill("удаление зуба 3.7")
  await check.click()
  await expect(page.getByText("ДА, покрыто").first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/п\. 1\.1 \(e2e\)/).first()).toBeVisible()

  await service.fill("имплантация зуба")
  await check.click()
  await expect(page.getByText("ЗАПРОСИТЬ ГАРАНТИЙНОЕ ПИСЬМО").first()).toBeVisible({ timeout: 10_000 })

  await service.fill("эндодонтическое лечение 25 зуба")
  await check.click()
  await expect(page.getByText(/гарантийное письмо/i).first()).toBeVisible({ timeout: 10_000 })
})

test("правила покрытия: поиск и сводка", async ({ page }) => {
  await page.goto("/coverage")
  await expect(page.getByText("Покрытие правилами:", { exact: false }).first()).toBeVisible()
  const q = page.getByPlaceholder(/Поиск по услуге/)
  await q.fill("удаление зуб")
  await page.getByRole("button", { name: "Найти" }).click()
  await expect(page.getByRole("table")).toBeVisible()
  await page.goto("/coverage/sources")
  await expect(page.getByRole("heading", { name: "Источники и покрытие" })).toBeVisible()
})

test("выход из аккаунта работает", async ({ page }) => {
  await page.goto("/logout")
  await page.waitForURL(/login/)
  await page.goto("/registry")
  await page.waitForURL(/login/) // без сессии реестр недоступен
})
