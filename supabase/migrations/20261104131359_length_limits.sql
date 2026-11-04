-- Security review: the same limits as the forms, also in the database, so a
-- request that skips the app cannot store oversized text (ADR-14).

alter table public.campaigns
  add constraint campaigns_name_length check (char_length(name) <= 100),
  add constraint campaigns_description_length check (description is null or char_length(description) <= 500);

alter table public.alert_settings
  add constraint alert_settings_config_size check (octet_length(threshold_config::text) <= 1000);

alter table public.import_jobs
  add constraint import_jobs_error_summary_size check (
    error_summary is null
    or (jsonb_array_length(error_summary) <= 100 and octet_length(error_summary::text) <= 100000)
  );
