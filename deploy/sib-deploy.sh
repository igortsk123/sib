#!/usr/bin/env bash
# Канонная копия серверного авто-деплоя sib (живёт в /usr/local/bin/sib-deploy.sh на проде,
# запускается systemd-таймером sib-deploy.timer каждые ~2 мин). В образ НЕ попадает (.dockerignore).
# Поток: tag prev → docker build (typecheck+test гейт в Dockerfile) → db:migrate → swap →
#        smoke /api/health → rollback на sib:prev при провале. Изолирован от sup2 (своя сеть/БД/порт).
set -euo pipefail
exec 9>/var/lock/sib-deploy.lock
flock -n 9 || { echo "deploy already running, skip"; exit 0; }

REPO=/opt/sib
STATE=/opt/sib-deployed.commit   # последний УСПЕШНО задеплоенный коммит (не git HEAD!)
cd "$REPO"
git fetch --quiet origin main
REMOTE=$(git rev-parse origin/main)
DEPLOYED=$(cat "$STATE" 2>/dev/null || echo none)
# Сверяем с реально задеплоенным коммитом, а НЕ с git HEAD: иначе провал сборки
# (git reset уже уехал на новый HEAD) навсегда стопорит авто-деплой до следующего пуша.
if [ "$REMOTE" = "$DEPLOYED" ] && [ "${1:-}" != "--force" ]; then exit 0; fi
SHORT=$(git rev-parse --short origin/main)
echo "[$(date -Is)] deploying $REMOTE"
git reset --hard origin/main

run_fe() {
  docker run -d --name sib-frontend --network sib-net --env-file /opt/sib.env \
    --restart unless-stopped -p 127.0.0.1:3006:3000 "$1"
}

# Образ для отката
docker tag sib:latest sib:prev 2>/dev/null || true

# Сборка (typecheck+test+build внутри Dockerfile — гейт). Падение здесь = старый контейнер не трогаем.
docker build --build-arg GIT_COMMIT="$SHORT" -t sib:new "$REPO"

# Миграции (одноразовый контейнер). Провал прерывает по set -e — старый контейнер жив.
docker run --rm --network sib-net --env-file /opt/sib.env sib:new pnpm db:migrate

# Свап на новый образ
docker tag sib:new sib:latest
docker rm -f sib-frontend 2>/dev/null || true
run_fe sib:latest

# Smoke: /api/health должен ответить 200 в течение ~60с
ok=0
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3006/api/health || echo 000)
  [ "$code" = "200" ] && { ok=1; break; }
  sleep 3
done

if [ "$ok" != "1" ]; then
  echo "[$(date -Is)] SMOKE FAILED ($SHORT) — ROLLBACK to sib:prev"
  docker rm -f sib-frontend 2>/dev/null || true
  docker tag sib:prev sib:latest 2>/dev/null || true
  run_fe sib:latest
  exit 1
fi

# Успех — фиксируем задеплоенный коммит (только теперь рано-выход сработает для него).
echo "$REMOTE" > "$STATE"

# Очистка после деплоя — только висячие образы (БЕЗ -a → чужие проекты не трогаем).
# Build-cache НЕ трогаем здесь: тёплый кэш = быстрый и устойчивый к сетевым сбоям ребилд
# (иначе каждый деплой заново тянет базовый образ/pnpm/пакеты). Глубокую чистку кэша
# делает еженедельный cron sib-docker-cleanup.sh — диск всё равно ограничен.
docker image prune -f >/dev/null 2>&1 || true
echo "[$(date -Is)] deployed $REMOTE OK (commit $SHORT)"
