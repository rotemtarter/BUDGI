-- Milestone 2: profiles, monthly budgets and business goals (ARCHITECTURE.md 3, 6.2)

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Name and email come from Google and are read-only in the app
grant update (onboarding_completed_at) on public.profiles to authenticated;

-- Create a profile for every new auth user (Google sign-in or test user)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- budgets: total monthly marketing budget
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null,
  planned_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_user_month_key unique (user_id, month),
  constraint budgets_month_first_day check (extract(day from month) = 1),
  constraint budgets_planned_amount_non_negative check (planned_amount >= 0)
);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- business_goals: monthly goals; target_value null = "no goal this month" (ADR-6)
-- ---------------------------------------------------------------------------

create table public.business_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null,
  goal_type text not null,
  target_value numeric(12, 2),
  updated_at timestamptz not null default now(),
  constraint business_goals_user_month_type_key unique (user_id, month, goal_type),
  constraint business_goals_month_first_day check (extract(day from month) = 1),
  constraint business_goals_goal_type check (goal_type in ('revenue', 'deals', 'leads', 'min_roas')),
  constraint business_goals_target_non_negative check (target_value is null or target_value >= 0),
  constraint business_goals_count_is_integer check (
    goal_type not in ('deals', 'leads') or target_value is null or target_value = trunc(target_value)
  )
);

create trigger business_goals_set_updated_at
  before update on public.business_goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS and grants for budgets and business_goals
-- (the unique constraints above also serve as the (user_id, month) indexes)
-- ---------------------------------------------------------------------------

alter table public.budgets enable row level security;
alter table public.business_goals enable row level security;

create policy "budgets_select_own" on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "business_goals_select_own" on public.business_goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "business_goals_insert_own" on public.business_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "business_goals_update_own" on public.business_goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "business_goals_delete_own" on public.business_goals
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.budgets, public.business_goals from anon, authenticated;
grant select, insert, update, delete on public.budgets, public.business_goals to authenticated;

-- ---------------------------------------------------------------------------
-- complete_onboarding: save first budget + revenue goal and finish onboarding
-- in one transaction. Runs as the caller, so RLS applies.
-- ---------------------------------------------------------------------------

create or replace function public.complete_onboarding(
  p_month date,
  p_budget numeric,
  p_revenue_goal numeric
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.budgets (user_id, month, planned_amount)
  values (v_user, p_month, p_budget)
  on conflict (user_id, month) do update set planned_amount = excluded.planned_amount;

  insert into public.business_goals (user_id, month, goal_type, target_value)
  values (v_user, p_month, 'revenue', p_revenue_goal)
  on conflict (user_id, month, goal_type) do update set target_value = excluded.target_value;

  update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- ensure_month_defaults: copy the total budget and the goals from the latest
-- earlier month that has them, when the requested month has none (PRD 4.2).
-- Campaign budgets are added here in Milestone 3.
-- ---------------------------------------------------------------------------

create or replace function public.ensure_month_defaults(p_month date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_source_month date;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.budgets (user_id, month, planned_amount)
  select v_user, p_month, b.planned_amount
  from public.budgets b
  where b.user_id = v_user and b.month < p_month
  order by b.month desc
  limit 1
  on conflict (user_id, month) do nothing;

  if not exists (
    select 1 from public.business_goals g where g.user_id = v_user and g.month = p_month
  ) then
    select max(g.month) into v_source_month
    from public.business_goals g
    where g.user_id = v_user and g.month < p_month;

    if v_source_month is not null then
      insert into public.business_goals (user_id, month, goal_type, target_value)
      select v_user, p_month, g.goal_type, g.target_value
      from public.business_goals g
      where g.user_id = v_user and g.month = v_source_month
      on conflict (user_id, month, goal_type) do nothing;
    end if;
  end if;
end;
$$;

revoke execute on function public.complete_onboarding(date, numeric, numeric) from public, anon;
revoke execute on function public.ensure_month_defaults(date) from public, anon;
grant execute on function public.complete_onboarding(date, numeric, numeric) to authenticated;
grant execute on function public.ensure_month_defaults(date) to authenticated;
