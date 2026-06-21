---
tier: 2
topic: external-sync
scope: Внешние интеграции sib — Яндекс IMAP/SMTP, OpenAI, Inngest; договор «не дрейфовать»
tier1: core/email-ingestion.md
updated: 2026-06-21
importance: high
source: manual
status: working
---

# Sync with External — внешние зависимости sib

> Все внешние вызовы — в обёртке (типизированный результат + Inngest-ретрай + user-facing ошибка),
> конституция §5. Реальные креды — `_secrets/ACCESS.md` (НЕ здесь).

## Сервисы
| Сервис | Назначение | Доступ | Статус |
|--------|-----------|--------|--------|
| **Яндекс IMAP** `imap.yandex.ru:993` | Забор входящих писем (ядро MVP) | XOAUTH2, ящик `palmarius.ru@yandex.ru` | ✅ 2026-06-21 LIST OK (ADR D2) |
| **Яндекс SMTP** `smtp.yandex.ru:465` | Отправка (уведомления — пост-MVP) | XOAUTH2, тот же токен | ✅ (работает в sup2) |
| **OpenAI** (RU-прокси) | LLM-распознавание сложных писем | `base_url`=прокси + ключ; `gpt-5.4-mini` | креды в sup2 ACCESS.md; прокси обязателен |
| **Inngest** | Durable-задачи + ретраи внешних вызовов | EVENT/SIGNING ключи | ⛔ ключей ещё нет |

## Принцип «check-before-write»
- Перед моделью письма/поля — сверься с **реальным** письмом (форматы страховых — гипотезы, §18.2), не выдумывай.
- OAuth-токен Яндекса живёт по refresh (авто-обновление access по refresh — паттерн из sup2 `yandex-oauth.ts`).
- LLM-ответ и тело письма — это **внешние данные**: валидировать схемой (zod), не доверять форме, фиксировать confidence.

## Грабли
- Прямой запрос к OpenAI из РФ → `403 unsupported_country_region`. **Только через прокси.**
- Яндекс scope документирован как `mail:smtp`, но **IMAP фактически работает** (проверено) — ADR D2.

**Tier 1:** `core/email-ingestion.md`, `core/recognition.md`.
