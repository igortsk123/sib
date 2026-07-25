\set ON_ERROR_STOP on
begin;
-- Причины отсутствия документов — показываются в сводке покрытия.
update program_alias set note = 'не публикуется в интернете — корпоративный договор клиники с СОГАЗ; ожидается загрузка клиникой'
 where program_name is null and insurance_company_id = (select id from insurance_company where name ilike '%СОГАЗ%');
update program_alias set note = 'не публикуется в интернете — программа договора клиники с Альфой (Томск); ожидается загрузка клиникой'
 where program_name is null and insurance_company_id = (select id from insurance_company where name ilike '%Альфа%');
-- заводим алиасы-заглушки с причиной для программ, которых ещё нет в справочнике
insert into program_alias (insurance_company_id, alias_norm, program_name, kind, note)
select ic.id, v.alias, null, 'program', v.note from (values
  ('РЕСО','амбулаторная помощь','уровень стоматологии в письме не указан — уточняется по договору клиники'),
  ('Совкомбанк','первичная консультация стоматолога-терапевта','правила ДМС не опубликованы: сайт закрыт для доступа; в письмах приходят конкретные услуги, а не программа'),
  ('ВСК','первичный прием стоматолога (терапевта, хирурга)','правила ДМС на сайте не публикуются (выдаются при заключении договора); в письмах — конкретные услуги'),
  ('Лучи','лучи здоровье','страховая не публикует правила ДМС в открытом доступе')
) as v(ck, alias, note)
join insurance_company ic on ic.name ilike '%'||v.ck||'%'
on conflict (insurance_company_id, alias_norm) do update set note = excluded.note;
select 'алиасов с причиной: ' || count(*) from program_alias where note is not null;
commit;
