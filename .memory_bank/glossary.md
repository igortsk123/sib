---
tier: 1
topic: glossary
scope: Термины ДМС/страхования и проекта — единый источник консистентности
tier2: ""
updated: 2026-07-22
importance: med
source: domain/product-spec.md
status: working
source_of_truth: supporting
last_verified: 2026-07-22
review_after: ""
---

# Glossary — термины ДМС и проекта

> Единый словарь: и для кода (идентификаторы), и для UI. Названия страховых → единый справочник.

## Домен
| Термин | Значение |
|--------|----------|
| **ДМС** | Добровольное медицинское страхование. |
| **Гарантийное письмо (ГП)** | Ответ страховой: подтверждение/отказ/условия мед. услуги пациенту по полису ДМС (срок, лимит, франшиза, услуги). Ядро продукта. |
| **Полис ДМС** | Договор страхования пациента (номер/серия — ключ поиска). **Страхователь** — работодатель, не пациент. |
| **Статус согласования** (`approvalStatus`) | approved/denied/detach/enroll/annul/partial/need_info/need_approval/unknown; подписи — `lib/letter-status.ts`. |
| **Тип документа** (`docType`) | guarantee/enroll/detach/annul/referral/denial/info_request/archive_password/service/other. |
| **Направление** (`careType`) | ambulatory/dentistry/combined/other; классификация по услуге (`lib/care-type.ts`), фильтр+колонка реестра/Excel. |
| **Лимит / франшиза / срок действия** | Предел покрытия / доля пациента / период валидности ГП. |
| **№ обращения / направления** | Идентификатор запроса в страховой. |

## Проект (код)
| Термин | Значение |
|--------|----------|
| **Сущности БД** | emailMessage / attachment / guaranteeLetter / insuranceCompany / appUser / auditLog (`lib/db/schema/*`, `core/data-model.md`). |
| **Мультитенант** | organization (клиника) → membership (сотрудник+роль) → platform admin над всеми; RBAC, скоуп реестра по клинике. |
| **Двойная пересылка** | клиника→разработчик→тестовый ящик; различать тех. и исходного отправителя (ADR D5). |
| **needsReview / очередь** | Записи с низкой уверенностью/неполные — на проверку; UI: фильтр «только проверка» + баннер. |
| **Метод разбора** (`method`) | deterministic (Парсер) / deterministic+llm / llm (ИИ) / llm_vision (скан). Журнал — `/parse-log`. |
| **doc_template / дрейф** | Образец типа × страховая → LLM-эталон → парсер; статусы new/llm_parsed/parser_ready/drift (ADR D15). |
| **Confidence** | Оценка надёжности поля + ссылка на фрагмент-источник. **Срез** — вертикальная фича UI→БД с тестами. |

## Язык / форматы
UI: русский. Идентификаторы в коде: English. Даты в UI: ДД.ММ.ГГГГ. Названия страховых — из справочника.
