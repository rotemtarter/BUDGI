-- rls_auto_enable() is created by Supabase with the project: the event trigger
-- `ensure_rls` uses it to turn on RLS for every new table in `public`. It is
-- SECURITY DEFINER and was executable by anon and authenticated through the
-- Data API (security advisor 0028/0029). The event trigger keeps working
-- without these grants; only direct calls are blocked.
-- The function may not exist in every project (e.g. budgi-prod), so check first.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
