import { expect, test as setup } from "@playwright/test"

// Один вход на весь прогон (анти-брутфорс пускает ≤5 запросов кода на процесс сервера) —
// сессия сохраняется в storageState и переиспользуется всеми тестами.
const TEST_PHONE = process.env.TEST_LOGIN_PHONE ?? "+79998887777"
const TEST_CODE = process.env.TEST_LOGIN_CODE ?? ""

setup("вход тест-логином", async ({ page }) => {
  setup.skip(!TEST_CODE, "TEST_LOGIN_CODE не задан в окружении")
  await page.goto("/login")
  await page.getByPlaceholder("+7 999 123-45-67").fill(TEST_PHONE)
  await page.getByRole("button", { name: /Получить код/ }).click()
  await page.getByLabel("Код из Telegram").fill(TEST_CODE)
  await page.getByRole("button", { name: "Войти", exact: true }).click()
  await page.waitForURL(/registry|admin|patients/, { timeout: 15_000 })
  await expect(page.getByText("Реестр писем ДМС").first()).toBeVisible()
  await page.context().storageState({ path: ".tmp/e2e-auth.json" })
})
