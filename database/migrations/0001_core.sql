-- Build step 1: the RFx, its shortlisted vendors and the RFI results, one demo copy per account.
-- Every table carries owner_id; row-level security lets each user see and change only their own rows.

create table public.rfx (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null,
  title text not null,
  buyer_company text not null,
  stage text not null default 'rfq'
    check (stage in ('need', 'rfi', 'rfp', 'rfq', 'replies', 'analysis', 'award', 'po')),
  tour_step int not null default 0 check (tour_step between 0 and 10),
  tour_hidden boolean not null default false,
  internal_request jsonb not null,
  created_at timestamptz not null default now()
);
-- One demo RFx per account.
create unique index rfx_owner_unique on public.rfx (owner_id);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  code text not null,
  name text not null,
  email text not null,
  reply_format text not null check (reply_format in ('excel', 'pdf', 'word', 'photo', 'email')),
  rfi_note text not null,
  rfp_summary text not null,
  status text not null default 'not_sent'
    check (status in ('not_sent', 'sent', 'replied', 'clarification_requested')),
  unique (rfx_id, code)
);

create table public.rfi_responses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  sort int not null,
  vendor_name text not null,
  iso_9001 boolean not null,
  fsc boolean not null,
  monthly_capacity text not null,
  shortlisted boolean not null,
  reason text not null
);

alter table public.rfx enable row level security;
alter table public.vendors enable row level security;
alter table public.rfi_responses enable row level security;

create policy "own rows" on public.rfx for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on public.vendors for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on public.rfi_responses for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Replace the caller's demo copy with a fresh one, in a single transaction.
-- Used on first login and by "Reset demo". Runs as the caller, so row-level security still applies.
create function public.seed_demo(p_rfx jsonb, p_vendors jsonb, p_rfi jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rfx uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  delete from rfx where owner_id = auth.uid();

  insert into rfx (code, title, buyer_company, stage, internal_request)
  select r.code, r.title, r.buyer_company, r.stage, r.internal_request
  from jsonb_populate_record(null::rfx, p_rfx) r
  returning id into v_rfx;

  insert into vendors (rfx_id, code, name, email, reply_format, rfi_note, rfp_summary)
  select v_rfx, v.code, v.name, v.email, v.reply_format, v.rfi_note, v.rfp_summary
  from jsonb_populate_recordset(null::vendors, p_vendors) v;

  insert into rfi_responses (rfx_id, sort, vendor_name, iso_9001, fsc, monthly_capacity, shortlisted, reason)
  select v_rfx, r.sort, r.vendor_name, r.iso_9001, r.fsc, r.monthly_capacity, r.shortlisted, r.reason
  from jsonb_populate_recordset(null::rfi_responses, p_rfi) r;

  return v_rfx;
end;
$$;

revoke execute on function public.seed_demo(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.seed_demo(jsonb, jsonb, jsonb) to authenticated;
