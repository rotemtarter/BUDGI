-- Exposing functions in the Data API settings also grants EXECUTE to anon.
-- Only signed-in users may call these functions (ARCHITECTURE.md 6.2).
revoke execute on function public.complete_onboarding(date, numeric, numeric) from anon;
revoke execute on function public.ensure_month_defaults(date) from anon;
