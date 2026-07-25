\set ON_ERROR_STOP on
begin;
with d as (select id, insurance_company_id from program_document where id::text like 'c97bf9d0%')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause)
select d.id, d.insurance_company_id, v.pn, v.sc, v.sp, v.vd, v.ct, v.la, v.cl from d cross join (values
(null,'общие-условия','страховой случай обращение за медпомощью по программе','conditional','страховой случай — обращение в учреждение из числа предусмотренных договором, в срок его действия и СТРОГО в соответствии с Программой страхования',null,'п. 4.3.1 – 4.3.3'),
(null,'общие-условия','выжидательный период','conditional','договором может быть установлен выжидательный период — обращения в этот срок страховым случаем не признаются',null,'п. 4.6'),
(null,'общие-условия','риски экстренная неотложная плановая помощь дистанционная консультация аптека','covered','набор рисков определяется договором: экстренная/неотложная/плановая помощь, телемедицина, лечебно-профилактическая помощь и аптека, репатриация',null,'п. 4.2.1 – 4.2.5'),
(null,'общие-условия','уточнение программы соглашением сторон','needs_approval','Программы страхования могут уточняться по соглашению сторон в пределах ответственности Страховщика',null,'п. 4.5')
) as v(pn, sc, sp, vd, ct, la, cl);
select count(*) from coverage_rule where document_id = (select id from program_document where id::text like 'c97bf9d0%');
commit;
