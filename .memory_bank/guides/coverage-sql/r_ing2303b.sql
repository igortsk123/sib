begin;
update coverage_rule set clause = 'п. 3.1.2 – 3.1.2.3'
 where clause = 'п. 3.1.2' and document_id = (select id from program_document where id::text like 'c7f32ed1%');
with d as (select id, insurance_company_id from program_document where id::text like 'c7f32ed1%')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause)
select d.id, d.insurance_company_id, 'Программы амбулаторно-поликлинической помощи (Прил. №1)', v.sc, v.sp, v.vd, v.ct, null, v.cl
from d cross join (values
('общие-условия','амбулаторно-курортное лечение санаторно-курортная карта','needs_approval','предоставить в Ингосстрах санаторно-курортную карту; на её основании Ингосстрах организует и оплачивает лечение','п. 2.4'),
('общие-условия','оплата напрямую медучреждению аптеке санаторию','conditional','страховая выплата производится оплатой напрямую медучреждению/фарморганизации/санаторию, а не пациенту','п. 2.5'),
('лекарства','возмещение расходов на лекарства и изделия медназначения','needs_approval','по письменному заявлению с оригиналами документов в установленный договором срок','п. 2.7.2')
) as v(sc, sp, vd, ct, cl);
commit;
