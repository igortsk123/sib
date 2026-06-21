---
tier: 2
topic: deployment
scope: Playbook деплоя/окружения — прод развёрнут (sib.docon.pro)
tier1: ""
updated: 2026-06-21
importance: high
source: manual
status: working
---

# Deployment — playbook (прод развёрнут 2026-06-21)

> **Прод живой:** https://sib.docon.pro (каркас, health=200). Инфра по образцу sup2, но **полностью
> изолирована** (своё репо/ключ/сеть/БД/контейнер/порт/скрипты). Каноничные серверные скрипты — в репо
> `deploy/`. ADR D8 (инфра/CI), D9 (UI-базлайн). Где хранить ПДн долгосрочно/оператор данных — всё ещё
> решение владельца (`core/human-decisions.md`, ADR D4); сейчас тот же VPS, что и sup2.

## Сервер
- Хост **193.160.208.41** (`4905763-ty25404`), root по SSH. Делит сервер с sup2/wfm/med/strapi и др.
- **sib-net** — отдельная docker-сеть. **sib-frontend** → `127.0.0.1:3006`, **sib-db**
  (postgres:16-alpine) → `127.0.0.1:5434`, том `/opt/sib-db-data`. Оба `--restart unless-stopped`.
- Чекаут: **`/opt/sib`** (git, ветка main, deploy-ключ `~/.ssh/sib_deploy`, алиас `github-sib`).
- Окружение контейнера: **`/opt/sib.env`** (600) — `DATABASE_URL` (на `sib-db`), `NEXT_PUBLIC_APP_URL`.
- nginx: `/etc/nginx/sites-available/sib.docon.pro` → `proxy_pass 127.0.0.1:3006`, TLS Let's Encrypt
  (certbot, авто-renew). HTTP→HTTPS 301. `client_max_body_size 25m` (вложения писем).

## CI/CD (push → авто-деплой)
- Триггер: **push в `main`** на GitHub `igortsk123/sib`. Серверный **systemd-таймер `sib-deploy.timer`**
  (каждые ~2 мин) запускает `/usr/local/bin/sib-deploy.sh` (канон — `deploy/sib-deploy.sh`).
- Поток: git poll → `tag sib:latest sib:prev` → `docker build` (**гейт typecheck+test в Dockerfile**) →
  `pnpm db:migrate` (одноразовый контейнер) → swap `sib-frontend` → **smoke `GET /api/health`** →
  при не-200 за ~60с **rollback на sib:prev**. GitHub Actions НЕ используем (таймера достаточно).
- Гейт сборки красный → старый контейнер не трогаем. Миграции **expand-only** (откат образа безопасен).
- **Самовосстановление:** идемпотентность по `/opt/sib-deployed.commit` (пишется ТОЛЬКО после успешного
  smoke), а не по git HEAD. Провал сборки (напр. сетевой сбой) → state-файл не обновлён → след. тик
  таймера повторяет, пока не соберётся. Сборка устойчива к флапам сети: ретраи `npm`/`pnpm` + **тёплый
  build-cache** (между деплоями кэш не трогаем — базовый образ/pnpm/пакеты не тянутся заново).

## Очистка диска (чтобы не разрасталось)
- **После каждого деплоя:** только `docker image prune -f` (висячие образы). Build-cache НЕ трогаем —
  тёплый кэш = быстрый и устойчивый ребилд.
- **Еженедельно** (вс 04:20) cron `/usr/local/bin/sib-docker-cleanup.sh`: `image prune -f` +
  `builder prune -a -f` (глубокая чистка кэша). Безопасно для общего сервера (**без `-a` на образах** —
  чужие проекты не трогаем). Лог `/var/log/sib-docker-cleanup.log`.

## Health
- `GET /api/health` → `{ok, service:"sib", db, commit, uptimeSec}`; 200 если БД доступна, иначе 503.
  Commit вшит в образ (`GIT_COMMIT`) для provenance.

## Что НЕ ломать (общий сервер)
- **sup2** (sup2-frontend:3005, sup2-db:5433, sup2-imagor, sup2-net), wfm-admin:3004, med:3003/8001,
  sup-frontend:3002, siberian:3001, strapi:1337. sib занял **3006 / 5434 / sib-net** — не пересекается.

## Follow-up (прод-устойчивость)
- [ ] Бэкап `sib-db` (как `sup2-db-backup.sh` + restore-drill) — добавить при первых реальных данных.
- [ ] Перенести почтовые/OpenAI/Inngest env в `/opt/sib.env` по мере появления срезов.
- [ ] Долгосрочное размещение ПДн / оператор данных — решение владельца (ADR D4).
