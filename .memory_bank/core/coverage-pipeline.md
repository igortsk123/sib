---
tier: 1
topic: coverage-pipeline
scope: Конвейер покрытия — как документы страховых превращаются в правила и попадают в карточку пациента
updated: 2026-07-25
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
`poll_program_docs.py` (сверка sha; веб-страницы — по тексту без разметки) →
`extract_doc_texts.py` (pdftotext постранично) → `carry_coverage_rules.py` (перенос правил на новую
редакцию; изменившийся пункт → `needs_review`).

## Ручной шаг — экстракция (агент, без внешних LLM)
Промпты по типу документа (A–E) и форме подачи (Ф1–Ф7) + чек-лист «новый источник» (13 пунктов):
`guides/coverage-extraction-prompt.md`. Исходники прогонов — `guides/coverage-sql/`.
Проверки: `tools/verify-coverage-rules.py` (по документу), `tools/audit-sources.py` (по процессу).

## Ответ на вопрос «покрыто ли»
`lib/server/coverage/resolve.ts`: строка письма → `normalize` → алиас → программы → правила программы
(приоритет) + правила страховой, кроме переопределённых программой; фильтр по редакции на дату полиса.
`lib/server/patients/state.ts` — текущее состояние пациента; `service-match.ts` — совпадает ли услуга
с действующим ГП (тип вмешательства + номер зуба).

## Интерфейс
`/coverage` (правила + баннер покрытия) · `/coverage/sources` (источники, пациенты, причины отсутствия) ·
карточка страховой → вкладка «Документы условий» · `/patients` и карточка пациента · карточка письма.

## Состояние и очередь
13 документов, ~370 правил, покрытие ~46% пациентов (цифры онлайн на `/coverage/sources`).
Что дальше и чего не хватает — `plans/coverage-roadmap.md`, [[coverage-assistant-vision]].
