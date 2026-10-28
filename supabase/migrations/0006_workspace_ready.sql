-- The sample workspace is only shown once it is completely built (a second first-visit request waits for this).
alter table public.workspace_seeds add column ready_at timestamptz;
update public.workspace_seeds set ready_at = seeded_at;
