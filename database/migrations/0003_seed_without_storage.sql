-- Supabase blocks deleting storage objects with SQL; uploaded files are now removed through the
-- Storage API by the app before reseeding. Same function as 0002 without the storage delete.
create or replace function public.seed_demo(p_rfx jsonb, p_vendors jsonb, p_rfi jsonb, p_contracts jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rfx uuid;
  v_contract uuid;
  c jsonb;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  delete from rfx where owner_id = auth.uid();

  insert into rfx (code, title, buyer_company, stage, internal_request, assumptions)
  select r.code, r.title, r.buyer_company, r.stage, r.internal_request, coalesce(p_rfx -> 'assumptions', '{}'::jsonb)
  from jsonb_populate_record(null::rfx, p_rfx) r
  returning id into v_rfx;

  insert into vendors (rfx_id, code, name, email, reply_format, rfi_note, rfp_summary)
  select v_rfx, v.code, v.name, v.email, v.reply_format, v.rfi_note, v.rfp_summary
  from jsonb_populate_recordset(null::vendors, p_vendors) v;

  insert into rfi_responses (rfx_id, sort, vendor_name, iso_9001, fsc, monthly_capacity, shortlisted, reason)
  select v_rfx, r.sort, r.vendor_name, r.iso_9001, r.fsc, r.monthly_capacity, r.shortlisted, r.reason
  from jsonb_populate_recordset(null::rfi_responses, p_rfi) r;

  for c in select * from jsonb_array_elements(p_contracts) loop
    insert into contracts (rfx_id, vendor_code, contract_no, valid_from, valid_to)
    values (v_rfx, c ->> 'vendor_code', c ->> 'contract_no', (c ->> 'valid_from')::date, (c ->> 'valid_to')::date)
    returning id into v_contract;

    insert into contract_lines (contract_id, line_no, spec_key, description, price, unit)
    select v_contract, l.line_no, l.spec_key, l.description, l.price, l.unit
    from jsonb_populate_recordset(null::contract_lines, c -> 'lines') l;
  end loop;

  return v_rfx;
end;
$$;
