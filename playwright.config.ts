import { execSync } from "node:child_process"

import { defineConfig } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────
// e2e (фаза Ф-B, конституция §3): вход тест-логином → реестр → пациенты → карточка →
// вопрос «можно ли делать» → правила покрытия → выход. Работает против локальной сборки
// (next start :3106) и локальной БД (docker sib-e2e-db) с вымышленными фикстурами —
// реальные ПДн в e2e не участвуют. Запуск: npm run test:e2e (нужен `npm run build` заранее).
// ─────────────────────────────────────────────────────────────────────

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  workers: 1, // общая БД и сессия — последовательный прогон стабильнее
  use: {
    baseURL: "http://127.0.0.1:3106",
    locale: "ru-RU",
    trace: "retain-on-failure",
    // Ядро 7.x (обновление ОС 26.07): сэндбокс chromium падает int3-трапом (ThreadPoolForeg/
    // Compositor) → ERR_INSUFFICIENT_RESOURCES. Без сэндбокса стабильно; для локальных e2e безопасно.
    launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
  },
  globalSetup: "./e2e/global-setup.ts",
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "flows",
      testMatch: /critical-flows\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: ".tmp/e2e-auth.json", baseURL: "http://127.0.0.1:3106", locale: "ru-RU" },
    },
  ],
  webServer: {
    command: "npx next start -p 3106 2>&1 | tee .tmp/e2e-server.log",
    url: "http://127.0.0.1:3106/api/health",
    reuseExistingServer: false, // свежий процесс на прогон: анти-брутфорс входа хранит счётчик в памяти
    timeout: 60_000,
  },
})

// Проверка на этапе загрузки конфига: без собранного .next стартовать бессмысленно.
try {
  execSync("test -d .next", { stdio: "ignore" })
} catch {
  throw new Error("Нет сборки .next — сначала `npm run build`")
}
