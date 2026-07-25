\set ON_ERROR_STOP on
begin;
delete from coverage_rule where document_id = (select id from program_document where storage_path='programs/energogarant_dms_125.pdf');
with d as (select id, insurance_company_id from program_document where storage_path='programs/energogarant_dms_125.pdf')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause, scope_level, overridable)
select d.id, d.insurance_company_id, null, v.sc, v.sp, v.vd, v.ct, null, v.cl, 'insurer', false
from d cross join (values
('общие-условия','страховой случай обращение за медицинской помощью по программе','conditional','страховым случаем признаётся обращение застрахованного за услугами, входящими в программу страхования','Раздел 4 «СТРАХОВЫЕ РИСКИ И СТРАХОВЫЕ СЛУЧАИ»'),
('общие-исключения','самоубийство попытка самоубийства','excluded',null,'п. 5.1.1'),
('общие-исключения','умышленные действия членовредительство','excluded','кроме доведения противоправными действиями третьих лиц, подтверждёнными решением суда','п. 5.1.2'),
('общие-исключения','алкогольное наркотическое токсическое опьянение','excluded',null,'п. 5.1.3'),
('общие-исключения','противоправные действия застрахованного','excluded','подтверждённые решениями соответствующих органов','п. 5.1.4'),
('общие-исключения','ядерная радиация военные действия народные волнения','excluded','если иное не предусмотрено договором страхования','п. 5.2.1'),
('общие-условия','услуги не предусмотренные договором страхования','excluded',null,'п. 5.2.2'),
('лекарства','лекарства в аптеке не предусмотренной договором','excluded',null,'п. 5.3.1'),
('лекарства','лекарства по рецептам организаций не предусмотренных договором','excluded',null,'п. 5.3.2 – 5.3.3'),
('лекарства','лекарства по рецепту не установленной формы или с нарушением порядка','excluded',null,'п. 5.3.4'),
('лекарства','лекарства по рецепту с истёкшим сроком или выписанному до включения в список застрахованных','excluded',null,'п. 5.3.5'),
('общие-исключения','экспериментальное исследовательское лечение','excluded',null,'п. 5.3.6'),
('общие-условия','услуги по желанию застрахованного или представителя клиники вне договора','excluded',null,'п. 5.3.7'),
('общие-условия','страховая сумма франшиза','conditional','страховая сумма и франшиза определяются договором страхования','Раздел 6 «СТРАХОВАЯ СУММА. ФРАНШИЗА»')
) as v(sc, sp, vd, ct, cl);
select 'энергогарант правил: ' || count(*) from coverage_rule cr join program_document pd on pd.id=cr.document_id
 where pd.storage_path='programs/energogarant_dms_125.pdf';
commit;
