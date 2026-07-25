begin;
with d as (select id, insurance_company_id from program_document where id::text like '48e6565f%')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause)
select d.id, d.insurance_company_id, '«ПОЛИКЛИНИКА.РУ» СТАНДАРТ (со стоматологией)', 'амбулатория-приёмы',
 'телемедицина дистанционные консультации', 'conditional',
 'дежурные врачи (терапевт, врач общей практики) — без ограничений; консультации врачей-специалистов — не более 3 за срок договора',
 '3 консультации', 'п. 1.6' from d;
commit;
