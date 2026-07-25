\set ON_ERROR_STOP on
begin;
-- Удаляем документы, не относящиеся к клинике (требование владельца: примеры не показываем,
-- нет документов — так и пишем). Каскадом уходят их тексты и правила.
create temporary table doomed as
select id, title from program_document where
     id::text like '6d393794%'   -- корпоративная страница НИУ ВШЭ: чужой договор, пример
  or id::text like '216bf684%'   -- её предыдущая версия
  or id::text like '86077e2a%'   -- программа СОГАЗ «Северсталь» (Череповец): чужой корпоративный договор
  or id::text like 'baf68b64%'   -- перечень клиник того же северсталевского договора
  or id::text like '9c6793a0%'   -- статья про стоматологию по ОМС (не ДМС)
  or id::text like 'ed37dc46%'   -- её предыдущая версия
  or id::text like 'fd00e728%'   -- правила «Здоровье» банкоканала Альфа-Банка: продукт НС, не ДМС клиники
  or id::text like '5344129f%';  -- его предыдущая версия
select 'удаляем: ' || title from doomed;
select 'правил будет удалено: ' || count(*) from coverage_rule where document_id in (select id from doomed);
delete from program_document where superseded_by_id in (select id from doomed);
delete from program_document where id in (select id from doomed);
-- РЕСО: правила от ООО «ОСЖ РЕСО-Гарантия» (страхование ЖИЗНИ), а письма от СПАО «РЕСО-Гарантия».
update program_document set title = 'Правила мед. страхования ОСЖ «РЕСО-Гарантия» (ред. 01.04.2023) — ВНИМАНИЕ: юрлицо страхования жизни',
  notes = coalesce(notes||'; ','') || 'юрлицо ОСЖ (страхование жизни); письма приходят от СПАО «РЕСО-Гарантия» — нужны правила СПАО'
where id::text like '02972b59%';
select 'осталось документов: ' || count(*) from program_document where superseded_by_id is null;
select 'осталось правил: ' || count(*) from coverage_rule;
commit;
