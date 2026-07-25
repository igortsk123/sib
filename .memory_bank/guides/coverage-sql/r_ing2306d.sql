begin;
with d as (select id, insurance_company_id from program_document where id::text like '93b76c4c%')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause)
select d.id, d.insurance_company_id, null, v.sc, v.sp, v.vd, v.ct, null, v.cl from d cross join (values
('лекарства','вакцинация против клещевого энцефалита любые вакцины','excluded','а также услуги и препараты без медицинских показаний','п. 11.23.4.4'),
('общие-условия','динамическое наблюдение после укуса клеща реабилитация сверх программы','excluded',null,'п. 11.23.4.5'),
('лекарства','иммуноглобулин йодантипирин одновременно повторный курс без назначения','excluded','возмещение йодантипирина — не более одного курса и только по назначению врача','п. 11.23.4.6'),
('лекарства','антибактериальные препараты амбулаторно по клещевой программе','excluded','если иное не предусмотрено Программой','п. 11.23.4.7'),
('общие-условия','онкопрограмма предшествующие заболевания период ожидания','excluded','симптомы, зафиксированные до начала договора или до истечения периода ожидания','п. 11.23.5.1 – 11.23.5.2')
) as v(sc, sp, vd, ct, cl);
commit;
