-- Exposing tables and functions in the Data API settings grants full access
-- to anon and authenticated (found when setting up budgi-prod, ADR-15). This
-- puts back exactly the grants of the earlier migrations: nothing for anon,
-- and for signed-in users only what the app needs (ARCHITECTURE.md 6.2).
-- Safe to run again; on a project that already has these grants it changes nothing.

revoke all on
  public.profiles, public.budgets, public.business_goals,
  public.campaigns, public.campaign_budgets, public.campaign_performance,
  public.import_jobs, public.alert_settings, public.alerts,
  public.advisor_usage, public.advisor_insights, public.advisor_locks
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (onboarding_completed_at, business_name) on public.profiles to authenticated;
grant select, insert, update, delete on
  public.budgets, public.business_goals,
  public.campaigns, public.campaign_budgets, public.campaign_performance,
  public.alert_settings
to authenticated;
grant select, insert on public.import_jobs to authenticated;
grant select, insert, delete on public.alerts to authenticated;
grant update (read_at) on public.alerts to authenticated;
grant select on public.advisor_usage to authenticated;
grant select, insert, delete on public.advisor_insights to authenticated;
-- advisor_locks: no grants; only its security definer functions use it

revoke execute on function
  public.complete_onboarding(date, numeric, numeric),
  public.ensure_month_defaults(date),
  public.commit_import(text, jsonb, integer, integer, jsonb),
  public.advisor_record_question(),
  public.advisor_acquire_lock(),
  public.advisor_release_lock(uuid)
from public, anon;
grant execute on function
  public.complete_onboarding(date, numeric, numeric),
  public.ensure_month_defaults(date),
  public.commit_import(text, jsonb, integer, integer, jsonb),
  public.advisor_record_question(),
  public.advisor_acquire_lock(),
  public.advisor_release_lock(uuid)
to authenticated;
revoke execute on function public.set_updated_at(), public.handle_new_user() from public, anon, authenticated;
