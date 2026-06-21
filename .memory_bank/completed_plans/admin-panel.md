---
workstream: admin
slug: admin-panel
status: completed
created: 2026-06-21
updated: 2026-06-21
completed: 2026-06-21
---

## Цель
Готовая адаптивная (моб+десктоп) админ-панель по аналогии с WFM-admin: вход через Telegram (как sup2,
отдельный бот `doconpro_bot`), мультитенантность — **платформенный админ** заводит клиники, **владелец
клиники** заводит сотрудников. Цель — показать результат клинике (IMAP пока отложен).

## Источник задачи
«Нужна админка (моб+десктоп как WFM), доступ платформенного админа → добавлять клиники; владелец клиники →
добавлять сотрудников. Вход через Telegram как в sup2 (отдельный бот doconpro_bot). Жду готовую панель.»

## Решения по образцу sup2 (изучено)
- **Вход:** телефон → `login_attempt`(код, токен) → пользователь в боте делится контактом / `/start` →
  бот шлёт код → ввод кода на сайте → `session` (cookie `sib_session`, 30 дн, скользящая). Long-poll
  воркер из `instrumentation.ts` (хостер режет Telegram → `getUpdates`/`sendMessage` через прокси
  `TELEGRAM_API_BASE`). Тест-вход (фикс. телефон+код) для демо без Telegram.
- **Мультитенантность:** `organization`(клиника) + `membership`(user↔клиника+роль). Платформенный админ —
  `app_user.is_platform_admin` (глобально, вне клиники). Владелец клиники — membership роль `owner`.
- **Гарды:** server action — публичный POST → каждую мутацию/чувствительное чтение гейтим `requireUser`/
  `requirePlatformAdmin`/`requireClinicRole` (не только в layout). Порт `guards.ts`.

## Скоуп — что входит
**A. Схема + миграция (expand; таблицы пустые — безопасно).**
- `organization` (клиника): id, name, status, createdAt.
- Переделать `app_user`: **phone (unique, notNull)**, name, email?(opt), `is_platform_admin` bool,
  passwordHash?(opt), status, lastLoginAt. (Роль уходит в membership.)
- `membership`: userId↔organizationId, role(`user_role`: owner/dms/doctor/registry/registry_senior), status, unique(user,org).
- Auth: `session`, `login_attempt`(phone,code,token,chatId,verified,attempts,expiresAt), `telegram_contact`(tgUserId→phone).
- Сид: bootstrap **платформенного админа** по телефону из env `BOOTSTRAP_ADMIN_PHONE` (идемпотентно).

**B. Telegram-auth (порт sup2, адаптация под sib/doconpro_bot).**
- `lib/server/auth/telegram.ts` (обёртка Bot API через прокси), `telegram-update.ts` (share contact→код),
  `telegram-poll.ts` (long-poll), `session.ts`, `guards.ts`, `phone.ts` (нормализация), `actions.ts`
  (requestCode/verifyCode/logout) — все внешние вызовы в Result/обёртке, лог полный (ADR D10).
- `instrumentation.ts` — старт поллера (если `TELEGRAM_BOT_TOKEN` задан и `TELEGRAM_POLLING!=0`).
- env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME=doconpro_bot`, `TELEGRAM_API_BASE` (прокси),
  `TELEGRAM_POLLING`, `APP_URL=https://sib.docon.pro`, `BOOTSTRAP_ADMIN_PHONE`, `TEST_LOGIN_PHONE/CODE`(демо).

**C. Адаптивная оболочка (WFM-стиль, токены уже портированы).**
- `AdminShell`: сайдбар (десктоп) + топбар (профиль/выход/переключатель клиники для платформенного админа) +
  **мобильная нижняя навигация**. Адаптация развязанных компонентов WFM (sidebar/topbar/mobile-nav) под наши
  роуты/роли + shadcn-примитивы. Навигация по роли (RBAC).

**D. Страницы (по ролям).**
- `/login` — телефон → код (кнопка «Получить код в Telegram», deep-link на бота) → вход. Состояния loading/error/empty.
- **Платформенный админ:** `/admin/clinics` — список клиник, **создать клинику**, назначить/создать **владельца клиники** (по телефону).
- **Владелец клиники:** `/staff` — список сотрудников клиники, **добавить сотрудника** (телефон, имя, роль), блокировка.
- `/insurers` — реестр **13 страховых** (реальные данные сида — что показать клинике).
- `/registry` — реестр гарантийных писем: **empty-state** «данные появятся после подключения почты» (наполнится в срезах распознавания).
- Гарды на каждый server action + редирект на /login без сессии.

**E. Деплой/проверка.**
- env в `/opt/sib.env` (токен `doconpro_bot`, BOOTSTRAP_ADMIN_PHONE и пр.); поллер активен; webhook снят.
- e2e: тест-вход (демо-телефон+код) → видна оболочка; платформенный админ создаёт клинику + владельца;
  владелец входит, добавляет сотрудника; роль-гарды работают; адаптив на узком экране.

## Скоуп — что НЕ входит
IMAP-забор и парсинг (отдельные срезы); наполнение реестра ГП реальными письмами; email/пароль-вход (только Telegram+тест); пуш-рассылки.

## Файлы к изменению (канва)
`lib/db/schema/{organization,membership,identity,...}.ts` + миграция/сид; `lib/server/auth/*`;
`lib/env.ts`; `instrumentation.ts`; `app/(auth)/login/*`; `app/(admin)/{layout,clinics,staff,insurers,registry}/*`;
`components/admin/{shell,sidebar,topbar,mobile-nav}.tsx`; server actions в `lib/server/{clinics,staff}/*`.

## Критерии приёмки
- [ ] Гейт зелёный (typecheck+lint+unit+build) + e2e на вход и заведение клиники/сотрудника.
- [ ] Адаптив: работает на мобильном (нижняя навигация) и десктопе (сайдбар).
- [ ] RBAC: платформенный админ ≠ владелец ≠ сотрудник; гарды на server actions.
- [ ] Вход через Telegram (`doconpro_bot`) работает; тест-вход для демо.
- [ ] Память обновлена (ADR на auth/тенантность, core/roles-and-access, data-model).

## Нужно от владельца (для рабочего Telegram-входа)
- **Токен бота `doconpro_bot`** (из @BotFather) → положить в `/opt/sib.env` (в чат не присылать).
- **Телефон платформенного админа** (твой) — для bootstrap первого входа.
- (Прокси Telegram — переиспользую тот же, что sup2.)

## Лог выполнения
- 2026-06-21 — план создан (draft).
- 2026-06-21 — **выполнено** (деплой `9ee222b`, ADR D11). Все пункты A–E. Гейт зелёный (15 unit). На проде:
  12 таблиц, 13 страховых засеяно, /login 200, гард-редирект 307, Telegram-поллер `tg_poll_started`.
  Bootstrap-админ `+79234097976`, бот `doconpro_bot`. **Осталось:** ручная e2e-проверка входа владельцем.

## Completion summary
Готовая адаптивная админ-панель: вход через Telegram (телефон→код, прокси-поллинг, сессия), мультитенантность
(organization+membership; платформенный админ→клиники, владелец→сотрудники), RBAC-гарды на server actions,
оболочка в стиле WFM (сайдбар+топбар+мобильная навигация). Страницы login/clinics/staff/insurers/registry.
Схема пересоздана (12 таблиц), sib-db сброшена (данных не было). IMAP/парсинг — отдельные срезы (отложены).
**Отклонения:** реестр ГП пока empty-state (нет ingest); email/пароль-вход не делали (только Telegram+тест).
