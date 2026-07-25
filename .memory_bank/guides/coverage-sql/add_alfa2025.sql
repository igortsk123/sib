\set ON_ERROR_STOP on
begin;
insert into program_document (insurance_company_id, title, doc_kind, source_url, file_url, storage_path,
  downloaded_at, applies_to, effective_from, notes, last_checked_at)
select ic.id, 'Правила ДМС АльфаСтрахование (приказ №367 от 19.12.2025) — действующие', 'rules',
  'https://www.alfastrah.ru/rules/zdorove/dms/',
  'https://www.alfastrah.ru/upload/iblock/149/ftr1x2qfs2jypmk3kyjw0hvrmpildfqz.pdf',
  'programs/alfa_dms_2025-12-19.pdf', now(), 'policies_from_date', '2025-12-19',
  'действующая редакция по реестру правил Альфы (перечень прислал владелец); применяется к корпоративным договорам', now()
from insurance_company ic where ic.name ilike '%Альфа%'
  and not exists (select 1 from program_document p where p.storage_path='programs/alfa_dms_2025-12-19.pdf');
-- существующий файл — это правила ДМС ФИЗИЧЕСКИХ ЛИЦ, помечаем явно, чтобы не путать с корпоративными
update program_document set
  title = 'Правила ДМС физических лиц АльфаСтрахование (приказ №84 от 09.04.2024)',
  effective_from = '2024-04-09',
  notes = coalesce(nullif(notes,''),'') || '; это правила для ФИЗЛИЦ; корпоративные договоры идут по правилам от 19.12.2025'
where storage_path like 'programs/alfa_pravila_dms%' and superseded_by_id is null;
select left(title,64) || ' | ' || coalesce(effective_from::text,'—')
from program_document where insurance_company_id = (select id from insurance_company where name ilike '%Альфа%')
  and superseded_by_id is null order by effective_from desc;
commit;
