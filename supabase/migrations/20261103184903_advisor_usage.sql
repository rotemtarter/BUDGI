-- Milestone 8: daily question counter of the AI Budget Advisor
-- (PRD 4.7; ARCHITECTURE.md 3.2, 5.6, 6.4; ADR-12)

-- ---------------------------------------------------------------------------
-- advisor_usage: one row per user and day (Israel time). The conversation
-- itself is never stored. Users can only read their row: the count changes
-- only through advisor_record_question(), so it cannot be reset or lowered.
-- ---------------------------------------------------------------------------

create table public.advisor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  question_count integer not null default 0,
  primary key (user_id, usage_date),
  constraint advisor_usage_count_range check (question_count between 0 and 20)
);

alter table public.advisor_usage enable row level security;

create policy "advisor_usage_select_own" on public.advisor_usage
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.advisor_usage from anon, authenticated;
grant select on public.advisor_usage to authenticated;

-- Counts one answered question for the signed-in user, today in Israel time.
-- Never goes above the daily limit of 20. Returns the new count.
-- security definer on purpose: users have no write access to the table, and
-- this function can only add one to their own count (ADR-12).
create or replace function public.advisor_record_question()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  day date := (now() at time zone 'Asia/Jerusalem')::date;
  result integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.advisor_usage as u (user_id, usage_date, question_count)
  values (uid, day, 1)
  on conflict (user_id, usage_date)
  do update set question_count = least(u.question_count + 1, 20)
  returning u.question_count into result;

  return result;
end;
$$;

revoke execute on function public.advisor_record_question() from public, anon;
grant execute on function public.advisor_record_question() to authenticated;
