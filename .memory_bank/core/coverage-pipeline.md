---
tier: 1
topic: coverage-pipeline
scope: Конвейер покрытия: документы страховых → правила → карточка пациента
updated: 2026-07-26
importance: high
source: manual
tier2: ../guides/coverage-extraction-prompt.md
---

# Конвейер покрытия (техническая сводка)

Зачем — [[coverage-assistant-vision]]. Здесь как устроено. Решения: D23–D27 в `decisions.md`.

## Слои и таблицы
| Слой | Таблица | Что |
|---|---|---|
| L0 источники | `program_document` | документ условий: ссылки (страница + файл), локальная копия, sha, редакция, цепочка версий `superseded_by_id` |
| L0 журнал | `document_check` | каждая проверка: `unchanged / updated / failed / skipped`, sha, http, сообщение |
| L1 текст | `document_text` | постранично, перезаливается по `document_id` |
| L2 правила | `coverage_rule` | услуга → `covered / excluded / needs_approval / conditional` + пункт, условие, лимит; `scope_level`, `overridable`, `needs_review` |
| Маппинг | `program_alias` | строка программы из письма → каноническое имя; `note` = причина, если документа нет |
| Пациент | `guarantee_letter.patient_key` | sha256(ФИО+дата рождения), триггер + индекс |

## Автоматика (`sib-programs.service`, Пн 06:30)
`poll_program_docs.py` (sha) → `extract_doc_texts.py` → `carry_coverage_rules.py` (перенос правил;
изменившийся пункт → `needs_review`) → `registry_watch.py` (D33: реестры сайтов СК из
`insurance_company.rules.registryUrl`, LLM-нормализация названий, редакции НОВЕЕ нашей скачиваются
и ждут экстракции). Онбординг новой СК/клиники — `../guides/onboarding.md`.

## Ручной шаг — экстракция (агент, без внешних LLM)
Промпты A–E × Ф1–Ф7 + чек-лист источника: `guides/coverage-extraction-prompt.md`; прогоны —
`guides/coverage-sql/`; проверки `tools/{verify-coverage-rules,audit-sources}.py`.

## Ответ «можно ли делать X за Y» (D30, D37) и запрос ГП (D29)
`answer-core.ts` — гейты: прикреплён? → действующее ГП (тип вмешательства+зуб; annul отзывает
по номеру) → правила → лимит; **catch-all**: услуга не названа + сноска «непредусмотренное не
покрывается» → чёткий НЕТ с пунктом; **уточнения-теги** из conditional-правил (клик → финальный
вердикт); **чат по правилам** — главный UI карточки (26.07 v2): история в БД
(`coverage_chat_message`, общая на пациента, автор виден), правила целиком + хвост истории (24)
в LLM каждый ход; без LLM — детерминированный ответ; GENERIC_WORDS против ложных совпадений
(«зуба»). Черновик запроса ГП reply-in-thread (`guarantee-request.ts`, .eml, БЕЗ отправки).
**ГП→прецеденты (D38):** СК без публичных правил — 227 правил «по согласованию» СО СРОКАМИ
(`gp_practice_rules.py`, таймер 05:10). Экономика: суммы корп-ДМС в договоре работодателя (D39).

## Интерфейс и состояние
`/coverage`(+sources) · карточка СК («Документы условий», «Распознавание и программы») ·
`/patients`+карточка (чат по правилам, запрос ГП). 13 документов, ~890 правил
(вкл. 227 прецедентов), покрытие ~92% онлайн. Очередь — `plans/coverage-roadmap.md`.
