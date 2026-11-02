-- A buyer's workspace holds many RFx at different stages (not one demo copy).

drop index if exists public.rfx_owner_unique;
drop function if exists public.seed_demo(jsonb, jsonb, jsonb, jsonb);

alter table public.rfx
  add column category text not null default 'Corrugated packaging',
  add column dataset text,                     -- the sample dataset behind this RFx, if any (sample replies, files)
  add column updated_at timestamptz not null default now();

-- Real arrival times instead of "Day N".
alter table public.messages add column received_at timestamptz not null default now();

-- Marks that a user's sample workspace has been created, so two first-visit requests can't both create it.
create table public.workspace_seeds (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  seeded_at timestamptz not null default now()
);
alter table public.workspace_seeds enable row level security;
create policy "own rows" on public.workspace_seeds for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Atomic single-key assumption update, now for one RFx.
drop function if exists public.merge_assumption(text, text, jsonb, boolean);
create function public.merge_assumption(p_rfx uuid, p_section text, p_key text, p_value jsonb, p_only_if_missing boolean default false)
returns void
language sql
security invoker
set search_path = public
as $$
  update rfx
  set assumptions = jsonb_set(
    case when assumptions ? p_section then assumptions else assumptions || jsonb_build_object(p_section, '{}'::jsonb) end,
    array[p_section, p_key],
    p_value,
    true
  ),
  updated_at = now()
  where id = p_rfx and owner_id = auth.uid()
    and not (p_only_if_missing and coalesce(assumptions -> p_section ? p_key, false));
$$;
revoke execute on function public.merge_assumption(uuid, text, text, jsonb, boolean) from public, anon;
grant execute on function public.merge_assumption(uuid, text, text, jsonb, boolean) to authenticated;

create index if not exists messages_rfx on public.messages (rfx_id);
create index if not exists quote_values_rfx on public.quote_values (rfx_id) where is_current;
create index if not exists issues_rfx on public.issues (rfx_id);
