\set ON_ERROR_STOP on
begin;
update coverage_rule set limit_amount = '1 раз в год' where clause = 'п. 3.1.3.2' and service_pattern ilike '%компьютерная томография%';
update coverage_rule set limit_amount = '1 раз в год' where clause = 'п. 3.1.3.2' and service_pattern ilike '%магнитно-резонансная%';
update coverage_rule set limit_amount = '10 сеансов' where clause = 'п. 3.1.4.2';
update coverage_rule set limit_amount = '2 раза в год' where clause = 'п. 3.1.3.1' and service_pattern ilike '%онкомаркер%';
update coverage_rule set limit_amount = 'не более 3 возбудителей' where clause = 'п. 3.1.3.1' and service_pattern ilike '%пцр%';
update coverage_rule set limit_amount = '2 приёма' where clause = 'п. 3.1.1' and service_pattern ilike '%психиатр%';
select left(coalesce(program_name,'(СК)'),34) || ' | ' || left(service_pattern,42) || ' | ' || limit_amount
from coverage_rule where limit_amount is not null
  and document_id = (select id from program_document where id::text like '86077e2a%');
commit;
