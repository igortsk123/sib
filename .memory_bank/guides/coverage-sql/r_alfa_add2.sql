begin;
with d as (select id, insurance_company_id from program_document where id::text like 'c97bf9d0%')
insert into coverage_rule (document_id, insurance_company_id, program_name, service_class, service_pattern, verdict, condition_text, limit_amount, clause)
select d.id, d.insurance_company_id, null, v.sc, v.sp, v.vd, v.ct, null, v.cl from d cross join (values
('общие-условия','репатриация останков','covered','при смерти застрахованного в срок договора — организация репатриации на территорию постоянного проживания, указанную в Программе','п. 4.3.4'),
('общие-условия','другие страховые случаи по программе','conditional','иные случаи признаются страховыми, только если прямо указаны в Программе страхования и произошли в срок договора','п. 4.3.5'),
('общие-условия','иные основания для отказа по договору','excluded','договором могут быть предусмотрены дополнительные основания для отказа/освобождения от выплаты','п. 5.4')
) as v(sc, sp, vd, ct, cl);
commit;
