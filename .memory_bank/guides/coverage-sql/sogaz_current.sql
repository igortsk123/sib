\set ON_ERROR_STOP on
begin;
-- Действующие правила ДМС СОГАЗ (реестр правил страховой прислал владелец):
--   003_Правила ДМС граждан — ред. 31.01.2023, действуют с 01.04.2023;
--   143_Правила ДМС           — ред. 01.02.2023, действуют с 01.04.2023.
-- Ранее по ошибке были загружены правила редакции 2015 года — снимаем их с активных.
insert into program_document (insurance_company_id, title, doc_kind, source_url, file_url, storage_path,
  downloaded_at, applies_to, effective_from, notes, last_checked_at)
select ic.id, '003_Правила ДМС граждан СОГАЗ (ред. 31.01.2023)', 'rules',
  'https://www.sogaz.ru/info/',
  'https://www.sogaz.ru/upload/iblock/61f/gfzzmt3213aoon60h7fkwar3j48hzpfj/003_Pravila-dobrovolnogo-meditsinskogo-strakhovaniya-grazhdan-ot-31.01.2023.PDF',
  'programs/sogaz_003_dms_grazhdan_2023.pdf', now(), 'policies_from_date', '2023-04-01',
  'действующая редакция по реестру правил СОГАЗ (перечень прислал владелец)', now()
from insurance_company ic where ic.name ilike '%СОГАЗ%'
  and not exists (select 1 from program_document p where p.storage_path='programs/sogaz_003_dms_grazhdan_2023.pdf');

insert into program_document (insurance_company_id, title, doc_kind, source_url, file_url, storage_path,
  downloaded_at, applies_to, effective_from, notes, last_checked_at)
select ic.id, '143_Правила ДМС СОГАЗ (ред. 01.02.2023)', 'rules',
  'https://www.sogaz.ru/info/',
  'https://www.sogaz.ru/upload/iblock/e92/bxem5j9y41inu8v21nqgk7v7h3q5w0hr/143_Pravila-dobrovolnogo-meditsinskogo-strakhovaniya-ot-01.02.2023.pdf',
  'programs/sogaz_143_dms_2023.pdf', now(), 'policies_from_date', '2023-04-01',
  'действующая редакция по реестру правил СОГАЗ (перечень прислал владелец)', now()
from insurance_company ic where ic.name ilike '%СОГАЗ%'
  and not exists (select 1 from program_document p where p.storage_path='programs/sogaz_143_dms_2023.pdf');

-- старые правила 2015 года: помечаем как вытесненные новой редакцией 143 (цепочка редакций сохраняется)
update program_document set superseded_by_id = (select id from program_document where storage_path='programs/sogaz_143_dms_2023.pdf'),
  notes = coalesce(notes||'; ','') || 'редакция 2015 года — заменена действующими 003/143 от 2023'
where storage_path = 'programs/sogaz_pravila_dms.pdf' and superseded_by_id is null;

select left(title,52) || ' | ' || coalesce(effective_from::text,'—') || ' | ' ||
  case when superseded_by_id is null then 'АКТИВНА' else 'вытеснена' end
from program_document pd
where insurance_company_id = (select id from insurance_company where name ilike '%СОГАЗ%')
order by superseded_by_id nulls first, title;
commit;
