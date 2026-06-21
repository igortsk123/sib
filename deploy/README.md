# deploy/ — инфраструктура прода (IaC-копии)

Канонные копии серверных скриптов sib. Живут на проде в `/usr/local/bin/`, версионируются здесь.
В Docker-образ не попадают (`.dockerignore`). **Полностью изолировано от sup2** (своя сеть `sib-net`,
своя БД `sib-db`, свой контейнер `sib-frontend` на `127.0.0.1:3006`, свои скрипты/таймер).

## Авто-деплой
- `sib-deploy.sh` → `/usr/local/bin/sib-deploy.sh`, запуск systemd-таймером `sib-deploy.timer` (~2 мин).
- Поток: git poll → `docker tag sib:latest sib:prev` → `docker build` (внутри Dockerfile **гейт
  typecheck+test**) → `pnpm db:migrate` (одноразовый контейнер) → swap контейнера →
  **smoke `/api/health`** → при не-200 за ~60с **rollback** на `sib:prev`.
- Откат безопасен, пока миграции **аддитивны** (expand-only). Breaking — в два шага (expand→деплой→contract).

## Сервер (193.160.208.41)
- `/opt/sib` — git checkout (приватный репо, deploy-ключ на сервере).
- `/opt/sib.env` — окружение контейнера (DATABASE_URL на `sib-db`, почта/LLM), chmod 600.
- `sib-db` — postgres:16-alpine на `sib-net`, том `/opt/sib-db-data`, порт `127.0.0.1:5434`.
- nginx `sib.docon.pro` → `proxy_pass http://127.0.0.1:3006` + TLS (certbot).

## Health
- `GET /api/health` → `{ok, db, commit, uptimeSec}`; 200 если БД доступна, иначе 503.

## systemd
- `sib-deploy.service` (oneshot, ExecStart=/usr/local/bin/sib-deploy.sh) + `sib-deploy.timer`
  (OnBootSec=2min, OnUnitActiveSec=2min).
