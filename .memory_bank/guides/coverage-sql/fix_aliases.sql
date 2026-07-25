\set ON_ERROR_STOP on
begin;

-- КОСЯК 1: «амбулаторная помощь» РЕСО была сопоставлена со «Стоматологией стандарт» —
-- это подмена смысла: амбулаторная помощь ≠ стоматологическая программа.
update program_alias set program_name = null,
  note = 'амбулаторная программа; уровень стоматологии в письме не указан — документа нет, уточняется по договору клиники'
where alias_norm = 'амбулаторная помощь'
  and insurance_company_id = (select id from insurance_company where name ilike '%РЕСО%');

-- КОСЯК 2: «телемедицина базис» вела на поликлиническую программу Ингосстраха.
update program_alias set program_name = null,
  note = 'телемедицинская опция, отдельного документа нет — покрытие определяется договором'
where alias_norm = 'телемедицина базис';

-- КОСЯК 3: склейки без разделителя в письмах — разбираем явными алиасами.
insert into program_alias (insurance_company_id, alias_norm, program_name, kind, note)
select ic.id, v.alias, v.prog, 'program', v.note
from (values
  ('Ингосстрах','специализированная стоматология поликлиника','«Специализированная стоматология» (Ингосстрах, актуальная)','в письме две программы слиты без разделителя'),
  ('Ингосстрах','поликлиника специализированная стоматология','«Специализированная стоматология» (Ингосстрах, актуальная)','в письме две программы слиты без разделителя')
) as v(ck, alias, prog, note)
join insurance_company ic on ic.name ilike '%'||v.ck||'%'
on conflict (insurance_company_id, alias_norm) do update
  set program_name = excluded.program_name, note = excluded.note;

-- КОСЯК 4: технические строки страховых в поле программы (номера договоров, служебные пометки,
-- в одном случае — ФИО сотрудника). Это не программы: помечаем, чтобы в сводке было видно.
insert into program_alias (insurance_company_id, alias_norm, program_name, kind, note)
select ic.id, v.alias, null, 'other', 'техническая строка страховой, не название программы — покрытие определяется договором клиники'
from (values
  ('Альфа','демск'), ('Альфа','12_2г'), ('Альфа','26_2026_томск'), ('Альфа','490 (томск)'),
  ('Альфа','дмс сотрудники волков денис'), ('Альфа','дмс сотрудники регион томск'),
  ('Ингосстрах','реабилитация после covid-19 вариант 2 (с обслуживанием на дому)')
) as v(ck, alias)
join insurance_company ic on ic.name ilike '%'||v.ck||'%'
on conflict (insurance_company_id, alias_norm) do update
  set program_name = null, kind = 'other', note = excluded.note;

select 'алиасов: ' || count(*) || ', из них с программой: ' || count(program_name) from program_alias;
commit;
