-- Security review: one Advisor question at a time per user (ADR-14). Without
-- it, many requests sent at once could all reach OpenAI before the daily
-- count goes up. The token is created on the server and never sent to the
-- browser, so a user cannot release a lock the server is holding.

create table public.advisor_locks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token uuid not null,
  locked_until timestamptz not null
);

alter table public.advisor_locks enable row level security;
-- No policies and no grants: only the two functions below use this table
revoke all on public.advisor_locks from anon, authenticated;

-- Takes the signed-in user's lock for up to 70 seconds (longer than the
-- Route's 60s limit, so a crashed request frees it). Returns the token, or
-- null when another question is still being answered.
create or replace function public.advisor_acquire_lock()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_token uuid := gen_random_uuid();
  result uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.advisor_locks as l (user_id, token, locked_until)
  values (uid, new_token, now() + interval '70 seconds')
  on conflict (user_id) do update
    set token = excluded.token, locked_until = excluded.locked_until
    where l.locked_until < now()
  returning l.token into result;

  return result;
end;
$$;

-- Frees the lock, only with the token that took it
create or replace function public.advisor_release_lock(p_token uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.advisor_locks where user_id = auth.uid() and token = p_token;
$$;

revoke execute on function public.advisor_acquire_lock() from public, anon;
revoke execute on function public.advisor_release_lock(uuid) from public, anon;
grant execute on function public.advisor_acquire_lock() to authenticated;
grant execute on function public.advisor_release_lock(uuid) to authenticated;
