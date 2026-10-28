-- Replies are processed in parallel; each may set one assumption (e.g. a vendor's freight).
-- Writing the whole assumptions object would let one reply overwrite another's change,
-- so this sets a single key atomically.
create function public.merge_assumption(p_section text, p_key text, p_value jsonb, p_only_if_missing boolean default false)
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
  )
  where owner_id = auth.uid()
    and not (p_only_if_missing and coalesce(assumptions -> p_section ? p_key, false));
$$;

revoke execute on function public.merge_assumption(text, text, jsonb, boolean) from public, anon;
grant execute on function public.merge_assumption(text, text, jsonb, boolean) to authenticated;
