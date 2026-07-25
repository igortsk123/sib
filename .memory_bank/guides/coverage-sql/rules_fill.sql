\set ON_ERROR_STOP on
begin;
with d as (select id, insurance_company_id from program_document where id::text like '02972b59%')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause)
select d.id, d.insurance_company_id, v.pn, v.sc, v.sp, v.vd, v.ct, v.la, v.cl
from d cross join (values
(null,'общие-условия','дополнительные расходы при транспортировке репатриации связь сопровождение перевод','excluded',null,null,'п. 5.5.1 – 5.5.3'),
(null,'общие-условия','отказ от репатриации перевода в другую клинику эвакуации','excluded','с момента отказа Страховщик не покрывает расходы',null,'п. 5.6.1 – 5.6.2'),
(null,'общие-условия','отказ страхователя оплатить дополнительную премию','conditional','вопрос получения услуг за личные средства застрахованный решает индивидуально',null,'п. 11.5.2'),
(null,'стационар','плановая госпитализация после окончания договора','excluded',null,null,'п. 11.6.8'),
(null,'общие-условия','возмещение расходов застрахованному наличными перечислением','needs_approval','возмещение возможно только по услугам, оказанным ПО СОГЛАСОВАНИЮ со Страховщиком; заявление — не позднее 90 дней, выплата — 15 рабочих дней','','п. 11.7 – 11.7.3')
) as v(pn, sc, sp, vd, ct, la, cl);
update coverage_rule set clause = 'п. 3.1.11 (в ряде программ — п. 3.1.12)'
 where clause = 'п. 3.1.11' and document_id = (select id from program_document where id::text like '0d3d05d5%');
update coverage_rule set limit_amount = null where limit_amount = '';
select count(*) from coverage_rule;
commit;
