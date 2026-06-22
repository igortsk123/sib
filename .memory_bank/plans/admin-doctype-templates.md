---
workstream: admin-recognition
slug: admin-doctype-templates
status: draft
created: 2026-06-22
updated: 2026-06-22
completed:
---

## Цель
Самообслуживаемая настройка распознавания по типам документов в админке: владелец/админ заводит тип
документа в разрезе страховой, загружает образец, система разбирает его LLM (эталон) и показывает,
где парсер промахивается (parse_log-дрейф) по этому типу.

## Контекст/ограничение (важно)
Прод-пайплайн распознавания пока **offline** (`.mail-intake`, dev): нет live-IMAP и нет тулзов извлечения
текста (pdftotext/xlrd/olefile) в Docker-образе — это **S1**. Поэтому:
- **MVP (этот план):** реестр шаблонов + LLM-эталон + видимость дрейфа (parse_log). Извлечение текста из
  загруженного файла — через **OpenAI vision** (картинка/скан) ИЛИ вставку текста; полноценный авто-разбор
  PDF/Excel в проде — после S1.
- **v2 (отдельно, зависит от S1):** авто-построение детерминированного парсера из эталона; live-переразбор
  входящих писем при появлении нового шаблона.

## Объём MVP (вертикальный срез UI→БД)
1. **Схема** (`lib/db/schema/doc-template.ts`, миграция 0009): таблица `doc_template`
   - insurer_id (fk), doc_type (enum docType), sample_storage_path, sample_filename, sample_text (nullable),
   - gold_json (jsonb — эталон LLM), status (enum: new|llm_parsed|parser_ready|drift), note, created/updated_at,
   - uniq (insurer_id, doc_type). Барель `schema/index.ts`.
2. **Страница страховой** `app/(admin)/insurers/[id]/page.tsx` (проваливание из `/insurers`):
   - шапка страховой (название, домены), секция **«Типы документов»**.
   - таблица шаблонов: тип, статус, ссылка на образец, превью эталона (gold_json), **«N записей на разбор»**
     (счётчик parse_log по insurer×doc_type) + ссылка на эти записи.
   - форма «Добавить тип»: select docType + загрузка файла (+ опц. поле «текст образца»).
   - доступ: только платформенный админ (RBAC-гард, как на `/insurers`).
3. **Server actions** (`lib/server/templates/actions.ts`):
   - `addDocTemplate(insurerId, docType, file, text?)` — сохранить файл в защищённое хранилище
     (`lib/storage.ts`, как оригиналы), создать строку (status=new).
   - `extractGold(templateId)` — вызвать OpenAI **gpt-5.5** (комплексный промпт «верни СТРОГИЙ JSON всех
     полей без перефраза»): по sample_text, иначе vision по файлу-картинке. Сохранить gold_json, status=llm_parsed.
   - `deleteDocTemplate(templateId)`.
4. **LLM**: добавить в `lib/server/llm/openai.ts` override модели (`ChatOpts.model`) — чтобы слать gpt-5.5
   для эталона (рантайм по-прежнему gpt-5.4-mini). Комплексный промпт-эталон — в `lib/server/templates/prompt.ts`
   (типы: гарантийное согласовано/отказ, прикрепление, открепление, аннулирование, направление; поля: ФИО/ДР/
   полис/№ГП/№обращения/№договора/статус/период с-по/срок действия/сумма-лимит/условия/услуги).
5. **parse_log-связь** (`lib/server/templates/queries.ts`): счётчик и список записей parse_log по (insurer, doc_type).
6. **Навигация**: строки `/insurers` делаем ссылками на `/insurers/[id]`.

## Гейт
typecheck + lint + test + build зелёные; миграция 0009 применяется; смоук `/insurers/[id]` (гард 307 без сессии).
RBAC: не-платформенный админ не видит. Секреты/ПДн — образцы в защищённом хранилище, не в git.

## Файлы
`lib/db/schema/doc-template.ts`, `lib/db/schema/index.ts`, `lib/db/schema/enums.ts` (templateStatus),
`drizzle/0009_*.sql`, `app/(admin)/insurers/[id]/page.tsx`, `app/(admin)/insurers/page.tsx` (ссылки),
`lib/server/templates/{actions,queries,prompt}.ts`, `lib/server/llm/openai.ts` (model override).

## Вне scope MVP
Авто-генерация regex из эталона; live-переразбор входящих; извлечение текста PDF/Excel в проде (→ S1).
