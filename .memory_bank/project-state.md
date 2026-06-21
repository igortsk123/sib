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
- **Прод:** N/A (greenfield, прод нет).
- **Репозиторий:** локально `/home/pakar/igor/sib`; git **не инициализирован**, remote нет.
- **Окружение / сервер:** TBD — где размещать ПДн решает владелец (`core/human-decisions.md`).
- **Деплой:** TBD.

## Что готово к 2026-06-21
- ✅ **Каркас Memory Bank развёрнут** из шаблона (`memory-bank-template`), режим autopilot, тип `dev`.
- ✅ **Яндекс-почта перенесена** из sup2 + **IMAP проверен рабочим** (XOAUTH2, `imap.yandex.ru:993`, LIST OK) —
  доп. консент не нужен (ADR D2). Креды — `_secrets/ACCESS.md`, рантайм — `.env.local`.
- ✅ **Стек зафиксирован** (ADR D1): Next.js + TS + Tailwind/shadcn + Postgres/Drizzle + Inngest.
- ✅ **Инженерная конституция принята** (ADR D3) → `.claude/rules/engineering-principles.md`.
- ✅ tmux-автосессия `igor` при открытии воркспейса (`.vscode/settings.json`).
- ⛔ **Кода ещё нет.** Следующий шаг — каркас Next.js-приложения + первый вертикальный срез.

## Ключевые решения (зафиксировано — полные ADR в `decisions.md`)
- D1 — стек Next.js/TS/Drizzle/Inngest. D2 — Яндекс IMAP-доступ подтверждён. D3 — конституция
  самопроверяемости. D4 — ПДн/мед.тайна = повышенная безопасность. D5 — двойная пересылка как
  первоклассный кейс. D6 — дедуп без авто-удаления.

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
