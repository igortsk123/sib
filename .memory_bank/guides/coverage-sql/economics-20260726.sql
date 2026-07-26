-- Экономика-аудит 26.07.2026 (запрос владельца): конкретные суммы из публичных правил → правила с limit_amount.
-- Найдено 3 места (весь остальной текст — юр-механизмы «сумма/франшиза устанавливается договором»
-- и тарифные таблицы Ингоса). Идемпотентно: delete по document_id+clause, затем insert.

-- ── РГС №152: клещевая программа, п. 15.2 (стр. 59) и п. 20.2.2.2 (стр. 71) ──
with doc as (select id, insurance_company_id ck from program_document
             where title ilike '%Росгосстрах №152%' and superseded_by_id is null limit 1)
delete from coverage_rule using doc
where coverage_rule.document_id = doc.id and coverage_rule.clause in ('п. 15.2', 'п. 20.2.2.2');

with doc as (select id, insurance_company_id ck from program_document
             where title ilike '%Росгосстрах №152%' and superseded_by_id is null limit 1)
insert into coverage_rule (insurance_company_id, document_id, program_name, service_class,
  service_pattern, verdict, condition_text, limit_amount, clause, scope_level, overridable, needs_review)
select ck, id, null, v.class, v.pattern, 'conditional', v.cond, v.lim, v.clause, 'insurer', true, false
from doc, (values
  ('диагностика', 'лабораторные исследования при самостоятельной оплате (клещевая программа)',
   'возмещение расходов при самостоятельной оплате амбулаторных услуг по программе от укуса клеща',
   '5 000 руб. в год', 'п. 15.2'),
  ('медикаменты', 'лекарственные препараты при самостоятельной оплате (клещевая программа)',
   'возмещение расходов при самостоятельной оплате по программе от укуса клеща',
   '5 000 руб. в год', 'п. 15.2'),
  ('прочее', 'репатриация тела до аэропорта/вокзала места проживания (клещевая программа)',
   'в случае смерти застрахованного во время лечения по разделу программы',
   '1 000 000 руб.', 'п. 20.2.2.2')
) as v(class, pattern, cond, lim, clause);

-- ── РЕСО (ред. 03.09.2025): клещевой боррелиоз — антибиотики ≤400 руб/курс (стр. 43) ──
with doc as (select id, insurance_company_id ck from program_document
             where title ilike '%РЕСО-Гарантия» (ред. 03.09.2025)%' and superseded_by_id is null limit 1)
delete from coverage_rule using doc
where coverage_rule.document_id = doc.id and coverage_rule.clause = 'клещевая программа, стр. 43';

with doc as (select id, insurance_company_id ck from program_document
             where title ilike '%РЕСО-Гарантия» (ред. 03.09.2025)%' and superseded_by_id is null limit 1)
insert into coverage_rule (insurance_company_id, document_id, program_name, service_class,
  service_pattern, verdict, condition_text, limit_amount, clause, scope_level, overridable, needs_review)
select ck, id, null, 'медикаменты',
  'антибактериальные препараты при клещевом боррелиозе (аптека по рецепту)',
  'conditional',
  'только при положительном результате исследования клеща или крови на боррелиоз; рецепт и чек по срокам программы',
  '400 руб. за один курс', 'клещевая программа, стр. 43', 'insurer', true, false
from doc;
