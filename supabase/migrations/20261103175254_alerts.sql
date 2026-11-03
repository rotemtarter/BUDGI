-- Milestone 7: alert settings and alerts (PRD 4.6; ARCHITECTURE.md 3.2, 5.5, 6.2; ADR-11)

-- ---------------------------------------------------------------------------
-- alert_settings: one row per user and alert type. No row = the defaults in
-- code. threshold_config is validated with Zod on the server.
-- ---------------------------------------------------------------------------

create table public.alert_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alert_type text not null,
  threshold_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint alert_settings_user_type_key unique (user_id, alert_type),
  constraint alert_settings_type check (
    alert_type in ('spend_pace', 'budget_overrun', 'performance_drop', 'goal_risk', 'goal_reached')
  ),
  constraint alert_settings_config_object check (jsonb_typeof(threshold_config) = 'object')
);

create trigger alert_settings_set_updated_at
  before update on public.alert_settings
  for each row execute function public.set_updated_at();

alter table public.alert_settings enable row level security;

create policy "alert_settings_select_own" on public.alert_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "alert_settings_insert_own" on public.alert_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "alert_settings_update_own" on public.alert_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "alert_settings_delete_own" on public.alert_settings
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.alert_settings from anon, authenticated;
grant select, insert, update, delete on public.alert_settings to authenticated;

-- ---------------------------------------------------------------------------
-- alerts: created by the Alert Service after a save or an import. The texts
-- are kept as they were when the alert was created. Only read_at can change.
-- ---------------------------------------------------------------------------

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alert_type text not null,
  severity text not null,
  title text not null,
  description text not null,
  related_campaign_id uuid references public.campaigns (id) on delete cascade,
  month date not null,
  dedupe_key text not null,
  deviation numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint alerts_type check (
    alert_type in ('spend_pace', 'budget_overrun', 'performance_drop', 'goal_risk', 'goal_reached')
  ),
  constraint alerts_severity check (severity in ('info', 'warning', 'critical')),
  constraint alerts_month_first_day check (extract(day from month) = 1),
  constraint alerts_title_length check (char_length(title) between 1 and 200),
  constraint alerts_description_length check (char_length(description) between 1 and 500)
);

create index alerts_user_created_idx on public.alerts (user_id, created_at desc);
create index alerts_user_dedupe_idx on public.alerts (user_id, dedupe_key, created_at desc);
create index alerts_related_campaign_idx on public.alerts (related_campaign_id);

alter table public.alerts enable row level security;

create policy "alerts_select_own" on public.alerts
  for select to authenticated using (user_id = (select auth.uid()));
-- A campaign alert must point to one of the user's own campaigns
create policy "alerts_insert_own" on public.alerts
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      related_campaign_id is null
      or exists (
        select 1 from public.campaigns c
        where c.id = related_campaign_id and c.user_id = (select auth.uid())
      )
    )
  );
create policy "alerts_update_own" on public.alerts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- Not offered in the UI; used by the test cleanup
create policy "alerts_delete_own" on public.alerts
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.alerts from anon, authenticated;
grant select, insert, delete on public.alerts to authenticated;
-- Marking as read is the only change
grant update (read_at) on public.alerts to authenticated;
