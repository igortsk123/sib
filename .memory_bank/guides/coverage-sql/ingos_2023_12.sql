\set ON_ERROR_STOP on
begin;
-- Реестр правил Ингосстраха (API сайта, запрошен с сервера) показал более свежую редакцию
-- «Правила добровольного медицинского страхования», опубликована 15.12.2023.
-- Наши правила (приказ №120 от 28.03.2023) становятся предыдущей редакцией.
insert into program_document (insurance_company_id, title, doc_kind, source_url, file_url, storage_path,
  downloaded_at, applies_to, effective_from, notes, last_checked_at)
select ic.id, 'Правила ДМС Ингосстрах (публикация 15.12.2023) — действующие', 'rules',
  'https://www.ingos.ru/company/disclosure-info/insurance-rules',
  'https://www.ingos.ru/docs/dms__rules-med-insure-new-2023.pdf',
  'programs/ingos_dms_2023-12.pdf', now(), 'policies_from_date', '2023-12-15',
  'найдено по реестру правил в API сайта страховой; предыдущая редакция — приказ №120 от 28.03.2023', now()
from insurance_company ic where ic.name ilike '%Ингосстрах%'
  and not exists (select 1 from program_document p where p.storage_path='programs/ingos_dms_2023-12.pdf');

update program_document set
  superseded_by_id = (select id from program_document where storage_path='programs/ingos_dms_2023-12.pdf'),
  title = 'Правила ДМС Ингосстрах (приказ №120 от 28.03.2023)',
  notes = coalesce(nullif(notes,''),'') || '; вытеснена редакцией от 15.12.2023'
where storage_path like 'programs/ingosstrah_dms_pravila%' and superseded_by_id is null;

select left(title,60) || ' | ' || coalesce(effective_from::text,'—') || ' | ' ||
  case when superseded_by_id is null then 'ДЕЙСТВУЕТ' else 'предыдущая' end
from program_document
where insurance_company_id = (select id from insurance_company where name ilike '%Ингосстрах%')
order by effective_from desc nulls last;
commit;
