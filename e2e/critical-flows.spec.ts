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

test("гейт новых типов (D48): held-запись скрыта, баннер виден", async ({ page }) => {
  await page.goto("/registry")
  // баннер «есть новые типы писем — напишите в поддержку» (фикстура держит 1 held-письмо)
  await expect(page.getByText(/Есть новые типы писем/)).toBeVisible()
  await expect(page.getByText(/напишите в поддержку/)).toBeVisible()
  // отложенная запись НЕ показывается в общем списке даже через поиск
  const search = page.getByPlaceholder(/поиск|фамилия|пациент/i).first()
  await search.fill("Отложенный")
  await search.press("Enter")
  await expect(page.getByRole("table")).toBeVisible()
  await expect(page.getByText("Отложенный Тип Письма")).toHaveCount(0)
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

test("чат по правилам: покрыто / исключено, история сохраняется", async ({ page }) => {
  await page.goto("/patients")
  await page.getByRole("link", { name: /Тестов Пациент/ }).first().click()
  await page.waitForURL(/\/patients\/[0-9a-f]{24}/)

  // ИИ-чат (владелец 26.07): вопросы в свободной форме; без LLM в e2e отвечает
  // детерминированный слой (answer-core) тем же текстом вердикта.
  const input = page.getByPlaceholder(/Вопрос по покрытию/)
  const ask = page.getByRole("button", { name: "Спросить" })

  await input.fill("удаление зуба 3.7")
  await ask.click()
  await expect(page.getByText("ДА, покрыто").last()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/п\. 1\.1 \(e2e\)/).last()).toBeVisible()

  await input.fill("имплантация зуба")
  await ask.click()
  await expect(page.getByText("ЗАПРОСИТЬ ГАРАНТИЙНОЕ ПИСЬМО").last()).toBeVisible({ timeout: 15_000 })

  // история общая и переживает перезагрузку страницы (хранится в БД)
  await page.reload()
  await expect(page.getByText("имплантация зуба").last()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("ЗАПРОСИТЬ ГАРАНТИЙНОЕ ПИСЬМО").last()).toBeVisible()
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
