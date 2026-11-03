-- Milestone 3: campaigns, monthly campaign budgets and weekly performance
-- (ARCHITECTURE.md 3, 6.2; ADR-1, ADR-7)

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  platform text not null,
  status text not null default 'active',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of the composite foreign keys below: child rows always belong to the campaign owner
  constraint campaigns_id_user_key unique (id, user_id),
  constraint campaigns_name_trimmed check (name = btrim(name) and name <> ''),
  constraint campaigns_platform check (platform in ('meta_ads', 'google_ads', 'tiktok_ads', 'linkedin_ads')),
  constraint campaigns_status check (status in ('active', 'paused', 'ended'))
);

-- No two campaigns with the same name (any case, trimmed) on the same platform
create unique index campaigns_user_name_platform_key
  on public.campaigns (user_id, lower(btrim(name)), platform);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_budgets: planned monthly budget per campaign.
-- planned_amount null = "no budget this month", so the copy to a new month
-- does not bring a removed budget back (ADR-7).
-- ---------------------------------------------------------------------------

create table public.campaign_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_id uuid not null,
  month date not null,
  planned_amount numeric(12, 2),
  updated_at timestamptz not null default now(),
  constraint campaign_budgets_campaign_fkey foreign key (campaign_id, user_id)
    references public.campaigns (id, user_id) on delete cascade,
  constraint campaign_budgets_campaign_month_key unique (campaign_id, month),
  constraint campaign_budgets_month_first_day check (extract(day from month) = 1),
  constraint campaign_budgets_planned_amount_non_negative check (planned_amount is null or planned_amount >= 0)
);

create index campaign_budgets_user_month_idx on public.campaign_budgets (user_id, month);

create trigger campaign_budgets_set_updated_at
  before update on public.campaign_budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_performance: one row per campaign per week (Sunday–Saturday).
-- A field that was not entered is null, never 0.
-- ---------------------------------------------------------------------------

create table public.campaign_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_id uuid not null,
  week_start date not null,
  spend numeric(12, 2),
  leads integer,
  deals integer,
  new_customers integer,
  revenue numeric(12, 2),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A campaign with weekly data cannot be deleted
  constraint campaign_performance_campaign_fkey foreign key (campaign_id, user_id)
    references public.campaigns (id, user_id) on delete restrict,
  constraint campaign_performance_campaign_week_key unique (campaign_id, week_start),
  constraint campaign_performance_week_is_sunday check (extract(dow from week_start) = 0),
  constraint campaign_performance_spend_non_negative check (spend is null or spend >= 0),
  constraint campaign_performance_leads_non_negative check (leads is null or leads >= 0),
  constraint campaign_performance_deals_non_negative check (deals is null or deals >= 0),
  constraint campaign_performance_new_customers_non_negative check (new_customers is null or new_customers >= 0),
  constraint campaign_performance_revenue_non_negative check (revenue is null or revenue >= 0),
  constraint campaign_performance_has_value check (num_nonnulls(spend, leads, deals, new_customers, revenue) >= 1),
  constraint campaign_performance_source check (source in ('manual', 'import'))
);

create index campaign_performance_user_week_idx on public.campaign_performance (user_id, week_start);

create trigger campaign_performance_set_updated_at
  before update on public.campaign_performance
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

alter table public.campaigns enable row level security;
alter table public.campaign_budgets enable row level security;
alter table public.campaign_performance enable row level security;

create policy "campaigns_select_own" on public.campaigns
  for select to authenticated using (user_id = (select auth.uid()));
create policy "campaigns_insert_own" on public.campaigns
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "campaigns_update_own" on public.campaigns
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "campaigns_delete_own" on public.campaigns
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "campaign_budgets_select_own" on public.campaign_budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "campaign_budgets_insert_own" on public.campaign_budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "campaign_budgets_update_own" on public.campaign_budgets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "campaign_budgets_delete_own" on public.campaign_budgets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "campaign_performance_select_own" on public.campaign_performance
  for select to authenticated using (user_id = (select auth.uid()));
create policy "campaign_performance_insert_own" on public.campaign_performance
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "campaign_performance_update_own" on public.campaign_performance
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "campaign_performance_delete_own" on public.campaign_performance
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.campaigns, public.campaign_budgets, public.campaign_performance from anon, authenticated;
grant select, insert, update, delete
  on public.campaigns, public.campaign_budgets, public.campaign_performance
  to authenticated;

-- ---------------------------------------------------------------------------
-- ensure_month_defaults: also copy each active campaign's budget from its
-- latest earlier month, when it has no row for the requested month (PRD 4.2)
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

  insert into public.campaign_budgets (user_id, campaign_id, month, planned_amount)
  select v_user, c.id, p_month, prev.planned_amount
  from public.campaigns c
  cross join lateral (
    select cb.planned_amount
    from public.campaign_budgets cb
    where cb.campaign_id = c.id and cb.month < p_month
    order by cb.month desc
    limit 1
  ) prev
  where c.user_id = v_user
    and c.status = 'active'
    and not exists (
      select 1 from public.campaign_budgets x where x.campaign_id = c.id and x.month = p_month
    )
  on conflict (campaign_id, month) do nothing;
end;
$$;

revoke execute on function public.ensure_month_defaults(date) from public, anon;
grant execute on function public.ensure_month_defaults(date) to authenticated;
