# SQL экстракции coverage_rule (исходники прогонов)

Все INSERT'ы правил покрытия, применённые к проду 2026-07-25 вручную агентом (без GPT).
Методика и промпты по типам документов — `../coverage-extraction-prompt.md`.
Идемпотентность: каждый файл начинается с `delete from coverage_rule where document_id = …`,
поэтому повторный прогон безопасен. Применение:
`ssh 'docker exec -i sib-db psql -U sib -d sib -v ON_ERROR_STOP=1' < файл.sql`

| Файл | Документ | Правил |
|---|---|---|
| rules_sogaz_fransh.sql | СОГАЗ «с франшизой» 2020 | 90 (+10 добор в rules_reso.sql) |
| rules_ingos_fl.sql, rules_fill.sql | Ингосстрах ФЛ 2020 (стом. программы) | 77 |
| rules_reso.sql | Правила РЕСО 2023 (5.1/5.2 + общие) | 57 |
| r_ing2306*.sql | Правила Ингосстрах 2023-06 | 90 |
| r_ing2303*.sql | Правила Ингосстрах 2023-03 | 35 |
| r_ingprog*.sql, r_tele.sql | Тексты программ Ингосстраха | 55 |
| r_alfa2404.sql, r_alfa_add*.sql | Правила Альфа 2024-04 | 24 |
| r_alfa_bank*.sql | Правила Альфа банкоканал 2024-01 | 30 |
| r_sogaz_web.sql | Корп. страница СОГАЗ (ВШЭ) | 10 |
| r_reso_web.sql | РЕСО корпоративная стоматология | 10 |
