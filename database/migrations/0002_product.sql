-- The full product: RFQ, messages and files, AI extraction results with their sources,
-- issues, questionnaire answers, contracts, scenarios, chat, award memo and the change log.
-- Every table carries owner_id and the same "own rows" row-level security policy.

-- RFQ terms, locked rules, demo clock and buyer assumptions live on the RFx.
alter table public.rfx
  add column drafted_at timestamptz,
  add column draft_source text check (draft_source in ('ai', 'prepared')),
  add column cover_email text,
  add column payment_days int,
  add column validity_days int,
  add column due_day int not null default 7,
  add column rules jsonb,
  add column rules_locked_at timestamptz,
  add column sent_at timestamptz,
  add column demo_day int not null default 0,
  add column assumptions jsonb not null default '{}'::jsonb,
  add column copilot_notes jsonb not null default '[]'::jsonb;

-- What each vendor told us about its terms (filled by extraction).
alter table public.vendors
  add column payment_days int,
  add column validity_days int,
  add column lead_time_days int,
  add column freight text check (freight in ('included', 'extra', 'unclear')),
  add column freight_note text,
  add column discount jsonb,
  add column terms_source jsonb;

create table public.line_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  line_no int not null,
  item_code text not null,
  description text not null,
  category text not null check (category in ('rsc', 'heavy', 'tray', 'partition', 'pad', 'sheet')),
  ply int not null,
  gsm int not null,
  bf int not null,
  flute text not null,
  length_mm int not null,
  width_mm int not null,
  height_mm int not null,
  qty_p1 int not null,
  qty_p2 int not null,
  spec_key text not null,
  is_new boolean not null default false,
  unique (rfx_id, line_no)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  q_no int not null,
  text text not null,
  points int not null,
  required boolean not null,
  unique (rfx_id, q_no)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  vendor_code text not null,
  contract_no text not null,
  valid_from date not null,
  valid_to date not null
);

create table public.contract_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  line_no int not null,
  spec_key text not null,
  description text not null,
  price numeric not null,
  unit text not null
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  kind text not null check (kind in ('rfq', 'reply', 'clarification_request', 'clarification_reply', 'upload')),
  from_addr text not null,
  to_addr text not null,
  subject text not null,
  body text not null,
  day int not null,
  late boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  filename text not null,
  kind text not null check (kind in ('excel', 'pdf', 'word', 'photo', 'certificate', 'text')),
  mime text not null,
  storage text not null check (storage in ('seed', 'upload')),
  path text not null,
  size_bytes int
);

create table public.processing_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  step text not null default 'Waiting to start',
  progress int not null default 0,
  lines_found int,
  error text,
  summary jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table public.quote_values (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  line_item_id uuid not null references public.line_items (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  raw jsonb not null,
  source jsonb,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  provenance text not null check (provenance in ('vendor', 'contract', 'clarification', 'manual')),
  contract_ref text,
  review text not null default 'auto' check (review in ('auto', 'accepted', 'edited')),
  is_current boolean not null default true,
  replaced_at timestamptz,
  created_at timestamptz not null default now()
);
create index quote_values_current on public.quote_values (vendor_id, line_item_id) where is_current;

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  line_item_id uuid references public.line_items (id) on delete cascade,
  quote_value_id uuid references public.quote_values (id) on delete set null,
  kind text not null check (kind in ('mapping', 'gst', 'discount', 'missing', 'terms', 'unreadable', 'certificate',
                                    'freight', 'no_history', 'low_confidence', 'questionnaire', 'injection')),
  title text not null,
  detail text not null,
  confidence text check (confidence in ('high', 'medium', 'low')),
  source jsonb,
  askable boolean not null default true,
  status text not null default 'open' check (status in ('open', 'asked', 'resolved')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  q_no int not null,
  answer text not null,
  met boolean not null,
  source jsonb,
  unique (vendor_id, q_no)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  valid_until date,
  source jsonb
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  name text not null,
  spec jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table public.award_memos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  scenario_id uuid references public.scenarios (id) on delete set null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rfx_id uuid not null references public.rfx (id) on delete cascade,
  label text not null,
  entity text not null,
  entity_id uuid,
  undo jsonb not null,
  undone boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['line_items', 'questions', 'contracts', 'contract_lines', 'messages', 'attachments',
                           'processing_runs', 'quote_values', 'issues', 'answers', 'certificates', 'scenarios',
                           'chat_messages', 'award_memos', 'change_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

-- Uploaded vendor replies: private bucket, one folder per user.
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 10485760)
on conflict (id) do nothing;

create policy "own uploads: read" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own uploads: write" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own uploads: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- The demo copy now also carries last year's contracts (enterprise memory).
drop function public.seed_demo(jsonb, jsonb, jsonb);

create function public.seed_demo(p_rfx jsonb, p_vendors jsonb, p_rfi jsonb, p_contracts jsonb)
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

  -- Uploaded files belong to the old copy; remove their storage objects too.
  delete from storage.objects
  where bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text;
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

revoke execute on function public.seed_demo(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.seed_demo(jsonb, jsonb, jsonb, jsonb) to authenticated;
