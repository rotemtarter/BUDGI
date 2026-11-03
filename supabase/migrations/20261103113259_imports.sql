-- Milestone 4: CSV/Excel import (ARCHITECTURE.md 3.2, 5.2, 6.2; ADR-8)

-- ---------------------------------------------------------------------------
-- import_jobs: one row per import attempt. Only counts, the file name and
-- row-level reasons are kept; the source file is never stored (6.5).
-- ---------------------------------------------------------------------------

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null,
  status text not null,
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_rejected integer not null default 0,
  campaigns_created integer not null default 0,
  error_summary jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint import_jobs_file_name_length check (char_length(file_name) between 1 and 255),
  constraint import_jobs_status check (status in ('completed', 'failed')),
  constraint import_jobs_counts_non_negative check (
    rows_total >= 0 and rows_imported >= 0 and rows_rejected >= 0 and campaigns_created >= 0
  ),
  constraint import_jobs_error_summary_array check (
    error_summary is null or jsonb_typeof(error_summary) = 'array'
  )
);

create index import_jobs_user_created_idx on public.import_jobs (user_id, created_at desc);

alter table public.import_jobs enable row level security;

create policy "import_jobs_select_own" on public.import_jobs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "import_jobs_insert_own" on public.import_jobs
  for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.import_jobs from anon, authenticated;
grant select, insert on public.import_jobs to authenticated;

-- ---------------------------------------------------------------------------
-- commit_import: saves the valid rows of an import in one transaction.
-- p_rows: [{name, platform, week_start, spend, leads, deals, new_customers,
-- revenue}], already normalized by the server, one row per campaign and week.
-- Each campaign key (name ignoring case/edge spaces + platform) uses one name.
-- Missing campaigns are created (active, no budget); a week that exists is
-- updated, and an empty (null) field never overwrites a stored value.
-- ---------------------------------------------------------------------------

create or replace function public.commit_import(
  p_file_name text,
  p_rows jsonb,
  p_rows_total integer,
  p_rows_rejected integer,
  p_errors jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_created integer;
  v_inserted integer;
  v_updated integer;
  v_job uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'no rows to import' using errcode = '22023';
  end if;

  insert into public.campaigns (user_id, name, platform)
  select distinct v_user, btrim(r.name), r.platform
  from jsonb_to_recordset(p_rows) as r (name text, platform text)
  on conflict do nothing;
  get diagnostics v_created = row_count;

  with r as (
    select *
    from jsonb_to_recordset(p_rows) as x (
      name text, platform text, week_start date,
      spend numeric, leads integer, deals integer, new_customers integer, revenue numeric
    )
  ),
  upserted as (
    insert into public.campaign_performance as cp
      (user_id, campaign_id, week_start, spend, leads, deals, new_customers, revenue, source)
    select v_user, c.id, r.week_start, r.spend, r.leads, r.deals, r.new_customers, r.revenue, 'import'
    from r
    join public.campaigns c
      on c.user_id = v_user
     and lower(btrim(c.name)) = lower(btrim(r.name))
     and c.platform = r.platform
    on conflict (campaign_id, week_start) do update set
      spend = coalesce(excluded.spend, cp.spend),
      leads = coalesce(excluded.leads, cp.leads),
      deals = coalesce(excluded.deals, cp.deals),
      new_customers = coalesce(excluded.new_customers, cp.new_customers),
      revenue = coalesce(excluded.revenue, cp.revenue),
      source = 'import'
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted)
  into v_inserted, v_updated
  from upserted;

  -- Every row must have reached its campaign
  if v_inserted + v_updated <> jsonb_array_length(p_rows) then
    raise exception 'some rows did not match a campaign' using errcode = '22023';
  end if;

  insert into public.import_jobs (
    user_id, file_name, status, rows_total, rows_imported, rows_rejected,
    campaigns_created, error_summary, completed_at
  )
  values (
    v_user, p_file_name, 'completed', p_rows_total, v_inserted + v_updated, p_rows_rejected,
    v_created, p_errors, now()
  )
  returning id into v_job;

  return jsonb_build_object(
    'job_id', v_job,
    'rows_inserted', v_inserted,
    'rows_updated', v_updated,
    'campaigns_created', v_created
  );
end;
$$;

revoke execute on function public.commit_import(text, jsonb, integer, integer, jsonb) from public, anon;
grant execute on function public.commit_import(text, jsonb, integer, integer, jsonb) to authenticated;
