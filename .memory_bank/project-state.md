---
tier: 1
topic: project-state
scope: Снимок «где проект сейчас» — точка ресинхронизации при /clear и resume
tier2: ""
updated: 2026-06-21
importance: high
source: manual
status: working
source_of_truth: canonical
last_verified: 2026-06-21
review_after: ""
---

# Project State — снимок состояния

> Обновлять после каждого крупного изменения. Это первое, что читает агент при resume/`/clear`.

## Где
- **Прод:** ✅ https://sib.docon.pro (каркас, health=200). Сервер `193.160.208.41` (тот же, что sup2),
  контейнер `sib-frontend`:3006 + `sib-db`:5434, сеть `sib-net`. Изолировано от sup2 (ADR D8).
- **Репозиторий:** `igortsk123/sib` (приватный), локально `/home/pakar/igor/sib`, чекаут на сервере `/opt/sib`.
  Deploy-ключ `sib_deploy` (алиас `github-sib`).
- **Деплой:** push в `main` → systemd-таймер `sib-deploy.timer` (~2 мин): build (гейт typecheck+test) →
  migrate → swap → smoke `/api/health` → rollback. Полный playbook — `deployment.md`.
- **Окружение / сервер:** долгосрочное размещение ПДн / оператор данных — всё ещё решение владельца (ADR D4).

## Что готово к 2026-06-21
- ✅ **Каркас Memory Bank развёрнут** из шаблона (`memory-bank-template`), режим autopilot, тип `dev`.
- ✅ **Яндекс-почта перенесена** из sup2 + **IMAP проверен рабочим** (XOAUTH2, `imap.yandex.ru:993`, LIST OK) —
  доп. консент не нужен (ADR D2). Креды — `_secrets/ACCESS.md`, рантайм — `.env.local`.
- ✅ **Стек зафиксирован** (ADR D1): Next.js + TS + Tailwind/shadcn + Postgres/Drizzle + Inngest.
- ✅ **Инженерная конституция принята** (ADR D3) → `.claude/rules/engineering-principles.md`.
- ✅ **Каркас Next.js-приложения собран** (план `infra-start-bootstrap`): Next 16/React 19/TS строгий/
  Tailwind 4/shadcn (radix, токены WFM)/Drizzle/Zod/vitest/exceljs; ленивый db-клиент, `/api/health`,
  Dockerfile с гейтом typecheck+test+build. **Зелёный гейт** typecheck+lint+test+build.
- ✅ **GitHub + CI/CD + прод** (ADR D8): репо `igortsk123/sib`, push→авто-деплой (systemd-таймер),
  контейнер `sib-frontend` за https://sib.docon.pro (health=200), отдельный `sib-db`, авто-очистка диска.
  Всё **изолировано от sup2**. UI-базлайн = WFM shadcn (ADR D9).
- ✅ tmux-автосессия `igor` при открытии воркспейса (`.vscode/settings.json`).
- ⏭ **Следующий шаг — первый прикладной вертикальный срез:** IMAP-забор тестового письма → парсинг →
  запись в БД → видно в реестре (доменная схема `lib/db/schema` пока пустая).

## Ключевые решения (зафиксировано — полные ADR в `decisions.md`)
- D1 — стек Next.js/TS/Drizzle/Inngest. D2 — Яндекс IMAP-доступ подтверждён. D3 — конституция
  самопроверяемости. D4 — ПДн/мед.тайна = повышенная безопасность. D5 — двойная пересылка как
  первоклассный кейс. D6 — дедуп без авто-удаления. D7 — типы простые + Zod на границах.
  **D8 — инфра/CI-CD методология sup2 при полной изоляции. D9 — UI-базлайн = shadcn radix из WFM.**

## Что НЕ делаем сейчас (вне scope)
См. `product_brief.md` → Scope-out (МИС-интеграция, авто-ответы, ЭЦП, BI, мобилка, авто-обучение).

## Open questions
Бриф §19 — кол-во и тип рабочих ящиков, app-password/IMAP-доступ, обязательные поля Excel и шаблон
импорта, нужно ли распознавать диагнозы/суммы/коды услуг, 2FA, хостинг ПДн/оператор данных, сроки
хранения. Все собраны в `core/human-decisions.md`. **Решать с владельцем, не угадывать.**

## Policies (как ведём разработку)
- **Вертикальные срезы** UI→БД; срез не готов без unit + e2e на критический поток.
- **Гейт перед «готово»:** typecheck + lint + unit + integration + e2e + build (красный = не готово).
- **Внешние вызовы** (IMAP, OpenAI, файлы) — только в обёртке: типизированный результат + ретрай
  через Inngest + заданное user-facing состояние ошибки.
- **Отклонение от спеки → ADR** в `decisions.md`. **Ветки** `feature/<area>`. **PR/срез** = зелёный CI +
  обновлённая память, если что-то отклонилось.
- Полная конституция — `.claude/rules/engineering-principles.md`.
