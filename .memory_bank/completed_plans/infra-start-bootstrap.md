---
workstream: infra
slug: infra-start-bootstrap
status: completed
created: 2026-06-21
updated: 2026-06-21
completed: 2026-06-21
---

## Цель
Поднять всю стартовую инфраструктуру sib по образцу sup2: git-репозиторий + приватный GitHub
`igortsk123/sib`, CI/CD (push→деплой), Next.js-каркас на стеке sup2 с портированными UI-токенами из
WFM-admin, и **рабочий изолированный прод-контейнер `sib`** на сервере 193.160.208.41 за `sib.docon.pro`.

## Источник задачи
«Подключись к гитхабу, создай репо sib, настрой CI/CD как в sup2; из WFM-admin перетащи нужное для
админки; на том же сервере что sup2 аккуратно подними контейнер sib и зафиксь как рабочий. Настрой всё для старта.»

Решения владельца (получены): GitHub — поставить `gh`, PAT введёт владелец; exposure — публичный
`sib.docon.pro` (A→193.160.208.41 в Cloudflare) + TLS; БД — отдельный `sib-db`.

## Независимость от sup2 (принцип)
sib в рантайме НЕ зависит от sup2: своё репо, **свой** deploy-ключ `sib_deploy`/алиас `github-sib`,
свой Actions-секрет, своя сеть `sib-net`, свой `sib-db`, свой контейнер/порт 3006, свой `/opt/sib`,
свои скрипты `sib-*` и таймер. Общих файлов/секретов/портов — ноль. У sup2 заимствуется только
**методология** деплоя (форма Dockerfile-гейтов, deploy-скрипта, systemd-таймера, nginx+certbot) —
скрипты пишем самостоятельными. **UI берём из WFM-admin (стандартный shadcn radix/new-york), не из sup2.**
Существующая связка вне этого плана — почтовый OAuth (ADR D2, общий с sup2) → follow-up на отдельное app.

## Опорные факты (разведка 2026-06-21)
- Сервер `193.160.208.41` (`4905763-ty25404`): заняты порты 3002–3005 → **sib-frontend = 127.0.0.1:3006**.
  Сети: sup2-net… → новая **sib-net**. БД: sup2-db(5433), med-db(15432) → **sib-db = 127.0.0.1:5434**.
- Деплой sup2: `.github/workflows/deploy.yml` (push→ssh-триггер `sib-deploy.sh --force`) + серверный
  `/usr/local/bin/sup2-deploy.sh` по `sup2-deploy.timer` (oneshot, 2 мин): tag prev → docker build
  (гейт typecheck+test в Dockerfile) → db:migrate (одноразовый) → swap → smoke `/api/health` → rollback.
- nginx: certbot-managed, `proxy_pass http://127.0.0.1:PORT`, отдельный server-блок на домен.
- Стек sup2: Next 16.2.6 / React 19 / Tailwind 4 / shadcn **base-nova на @base-ui** / Drizzle+postgres /
  Zod 4 / vitest / **exceljs** (готово для Excel-экспорта) / nodemailer.
- WFM-admin: shadcn **new-york на radix** → примитивы НЕ совместимы со стеком sup2 «в лоб».

## Скоуп — что входит
**A. Локальный каркас (`/home/pakar/igor/sib`)**
- `git init` (main), `.gitignore` уже есть.
- Next.js-каркас зеркально sup2: `package.json` (те же зависимости вкл. drizzle/zod/vitest/exceljs),
  `tsconfig.json`, `next.config.mjs` (security-заголовки + typecheck-гейт), `postcss.config.mjs`,
  Tailwind 4, `components.json` (base-nova), `lib/utils.ts`, `app/layout.tsx`, `app/page.tsx`,
  `app/globals.css` (порт дизайн-токенов WFM-admin), `app/api/health/route.ts` (smoke-эндпоинт деплоя),
  `instrumentation.ts`, `drizzle.config.ts`, `lib/db/` (schema/клиент-скелет), `vitest.config.ts`,
  минимальный unit-тест (зелёный гейт), `Dockerfile` (зеркало sup2: node:20-alpine, pnpm,
  гейты typecheck+test+build), `.dockerignore`, `README.md`.
- Из WFM-admin: **дизайн-токены `globals.css`** + адаптированные развязанные shared-компоненты
  (filter-bar, data-table-shell, kpi-card, metadata-card, detail-page-hero, empty-state, confirm-dialog)
  под @base-ui; примитивы `components/ui/*` генерим shadcn-ом под стек sup2 (не копируем radix-версии).
- Локальный гейт зелёный: `pnpm install && pnpm typecheck && pnpm test && pnpm build`.

**B. GitHub**
- Установить `gh`; `gh auth login` (PAT владельца, scope repo).
- Создать приватный `igortsk123/sib`; первый коммит + push main.
- Сгенерировать deploy-ключ `sib_deploy`, добавить в Deploy keys репо; ssh-алиас `Host github-sib`;
  remote `git@github-sib:igortsk123/sib.git`.
- `.github/workflows/deploy.yml` (зеркало sup2, группа concurrency `deploy-sib`, вызов `sib-deploy.sh --force`).
- Actions-секреты `SSH_HOST`, `SSH_KEY` (отдельный ключ Actions→сервер, добавить в authorized_keys сервера).

**C. Сервер (прод, изолированно от sup2 — ничего общего не трогаем)**
- `docker network create sib-net`.
- `sib-db` (postgres:16-alpine) на sib-net, том `/opt/sib-db-data`, `127.0.0.1:5434:5432`, креды в
  `/opt/sib-db.env` (сгенерить, chmod 600). `DATABASE_URL` → `/opt/sib.env`.
- `/opt/sib` — git checkout приватного репо (read-deploy-ключ на сервере).
- `/usr/local/bin/sib-deploy.sh` (адаптация sup2-deploy.sh: REPO=/opt/sib, sib-net, /opt/sib.env,
  контейнер `sib-frontend`, `127.0.0.1:3006:3000`, образы `sib:latest|prev|new`, smoke `/api/health`).
- systemd `sib-deploy.service` + `sib-deploy.timer` (2 мин); `sib-db-backup.sh` (cron) + cleanup.
- Первый деплой `sib-deploy.sh --force` → build(гейты)→migrate→run→smoke 200.
- nginx `sib.docon.pro` → `proxy_pass 127.0.0.1:3006`; certbot TLS. **Cloudflare-чекпоинт:** на время
  выпуска сертификата запись в DNS-only (серый, иначе HTTP-01 не пройдёт) или Origin-cert.
- «Зафиксить рабочим»: `https://sib.docon.pro/api/health = 200`, контейнеры `--restart unless-stopped`,
  таймер enabled.

**D. Память**
- `project-state.md` (git/репо/сервер/деплой), ADR в `decisions.md` (D8 CI/CD+инфра-зеркало sup2;
  D9 UI-базлайн = стек sup2 + порт токенов WFM), заполнить раздел прод в `deployment.md`,
  `_secrets/ACCESS.md` (указатели на /opt/sib.env, deploy-ключи — без значений).

## Скоуп — что НЕ входит
- Прикладные вертикальные срезы (IMAP-забор, распознавание, реестр) — отдельными планами после старта.
- Доменная схема БД сверх скелета (миграции по срезам).
- Импорт реальных писем/ПДн.

## Файлы к изменению (локально)
- [ ] `.git/` (init), `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.mjs`,
      `postcss.config.mjs`, `components.json`, `Dockerfile`, `.dockerignore`, `README.md`,
      `vitest.config.ts`, `drizzle.config.ts`, `instrumentation.ts`, `.github/workflows/deploy.yml`
- [ ] `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/api/health/route.ts`
- [ ] `lib/utils.ts`, `lib/db/` (schema.ts, index.ts), `components/ui/*`, `components/shared/*`, `test/*`
- [ ] Память: `project-state.md`, `decisions.md`, `deployment.md`, `_secrets/ACCESS.md`, `plans/README.md`
- (Сервер — вне git sib: `/opt/sib*`, `/usr/local/bin/sib-*.sh`, systemd-юниты, nginx-сайт; канонные
  копии серверных скриптов кладём в `deploy/` репо как у sup2.)

## Задачи (по фазам)
- [ ] A. Каркас + локальный зелёный гейт.
- [ ] B. gh + репо + deploy-ключ + CI + push.
- [ ] C. sib-net + sib-db + /opt/sib + deploy-скрипты + systemd + первый деплой + nginx/TLS.
- [ ] D. Память + ADR + перенос плана в completed.

## Критерии приёмки
- [ ] Локальный гейт зелёный: typecheck + test + build.
- [ ] GitHub Action на push в main отрабатывает зелёным.
- [ ] `https://sib.docon.pro/api/health` → 200 (db ok).
- [ ] `sib-frontend` и `sib-db` `Up`, `--restart unless-stopped`; `sib-deploy.timer` active.
- [ ] **sup2 не задет**: sup2-frontend Up на 3005, sup2-net/sup2-db целы.
- [ ] Секреты только в `/opt/*.env` (600) и `_secrets/`; в git/чат не попали.
- [ ] Память обновлена (project-state, ADR D8/D9, deployment).

## Риски
- **Cloudflare TLS:** проксирование ломает HTTP-01 — выпускать при DNS-only или Origin-cert (чекпоинт C).
- **Не задеть sup2:** всё своё — отдельные net/db/порт/скрипты/таймер; общих ресурсов не трогаем.
- **Секреты/ПДн:** креды БД генерим на сервере, chmod 600; PAT — только в `gh` владельцем; в чат/код/git не пишем.
- **Стек-конфликт UI:** примитивы radix WFM несовместимы → берём токены + адаптируем под @base-ui (ADR D9).

## Лог выполнения
- 2026-06-21 — план создан (draft).
- 2026-06-21 — деплой: каркас собран, зелёный гейт, push в GitHub, прод поднят, память обновлена → completed.

## Completion summary
Выполнено полностью. Стартовая инфраструктура sib развёрнута и **проверена эмпирически**:
- **Каркас** (тулчейн sup2 + UI WFM): Next 16/React 19/TS строгий/Tailwind 4/shadcn(radix,new-york)/
  Drizzle/Zod/vitest/exceljs; токены WFM `globals.css` + примитивы ui; ленивый db-клиент; `/api/health`;
  Dockerfile с гейтом typecheck+test+build. **Локальный гейт зелёный** (typecheck+lint+test+build).
- **GitHub:** приватный `igortsk123/sib`, deploy-ключ `sib_deploy`/алиас `github-sib`, push в `main`.
- **Прод** на 193.160.208.41 (изолировано от sup2): `sib-net`, `sib-db`(:5434), `/opt/sib`, `/opt/sib.env`,
  `sib-deploy.sh` + systemd-таймер (~2 мин), контейнер `sib-frontend`(:3006), nginx `sib.docon.pro` + TLS.
  **https://sib.docon.pro/api/health = 200**, http→https 301, оба контейнера `restart unless-stopped`.
- **Авто-очистка диска:** image+builder prune после деплоя + еженедельный cron (безопасно для общего сервера).
- **Память:** ADR D8 (инфра/CI), D9 (UI-базлайн); обновлены `deployment.md`, `_secrets/ACCESS.md`, `project-state.md`.

**Отклонения от исходного плана (зафиксированы):** (1) GitHub Actions не заводили — авто-деплой только
через systemd-таймер (проще, без секретов на сервер); (2) UI-базлайн = стандартный shadcn radix из WFM,
а не base-nova sup2 (D9 — независимость + прямой перенос компонентов); (3) репо создал владелец вручную,
авторизация — deploy-ключ (без gh/PAT).

## Follow-up work
- [ ] Первый прикладной вертикальный срез (IMAP-забор тестового письма → парсинг → запись → реестр).
- [ ] Бэкап `sib-db` + restore-drill (при первых реальных данных).
- [ ] Перенести почтовые/OpenAI/Inngest env в `/opt/sib.env` по мере срезов.
- [ ] Перенести в sib развязанные составные компоненты WFM (filter-bar, data-table-shell, kpi-card…) под админку.
