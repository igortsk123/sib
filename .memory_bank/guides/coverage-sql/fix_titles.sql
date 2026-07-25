\set ON_ERROR_STOP on
begin;
-- Названия документов приводим к ФАКТИЧЕСКОМУ приказу из титула (раньше стояли выдуманные
-- даты редакций — из-за этого не было видно, что часть правил Ингосстраха 2017–2019 годов).
update program_document set
  title = 'Правила ДМС Ингосстрах (приказ №120 от 28.03.2023) — действующие',
  effective_from = '2023-03-28',
  notes = coalesce(nullif(notes,''),'') || '; титул: приказ СПАО «Ингосстрах» №120 от 28.03.2023'
where storage_path like 'programs/ingosstrah_dms_pravila%';

update program_document set
  title = 'Правила ДМС Ингосстрах (приказ №188 от 07.05.2019)',
  effective_from = '2019-05-07',
  notes = coalesce(nullif(notes,''),'') || '; титул: приказ СПАО «Ингосстрах» №188 от 07.05.2019 — более ранняя редакция'
where storage_path like 'programs/ingosstrah_dms_2026%';

update program_document set
  title = 'Правила ДМС физических лиц Ингосстрах (приказ №479 от 25.12.2017)',
  effective_from = '2017-12-25',
  notes = coalesce(nullif(notes,''),'') || '; титул: приказ СПАО «Ингосстрах» №479 от 25.12.2017 — правила для физлиц'
where storage_path like 'programs/ingosstrah_pravila_dms_fl%';

update program_document set
  title = 'Ингосстрах: тексты программ ДМС (приложения к правилам)',
  notes = coalesce(nullif(notes,''),'') || '; сборник программ, публикуется по адресу cdn.ingos.ru/docs/prog_dms.pdf'
where storage_path like 'programs/ingosstrah_programmy_dms%';

select left(title,62) || ' | действует с ' || coalesce(effective_from::text,'—')
from program_document where superseded_by_id is null
  and insurance_company_id = (select id from insurance_company where name ilike '%Ингосстрах%')
order by effective_from desc nulls last;
commit;
