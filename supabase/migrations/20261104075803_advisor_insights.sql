-- Milestone 8: Advisor answers the user chose to keep as saved insights
-- (PRD 4.7; DESIGN.md 1.12; ARCHITECTURE.md 3.2; ADR-13). The rest of the
-- conversation is never stored.

create table public.advisor_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question text not null,
  -- The answer as shown when saved: answer, recommendations, limitations and
  -- missing-data request. Validated with Zod on save and on read.
  reply jsonb not null,
  created_at timestamptz not null default now(),
  constraint advisor_insights_question_length check (char_length(question) between 1 and 1000),
  constraint advisor_insights_reply_object check (jsonb_typeof(reply) = 'object'),
  constraint advisor_insights_reply_size check (octet_length(reply::text) <= 32000)
);

create index advisor_insights_user_created_idx on public.advisor_insights (user_id, created_at desc);

alter table public.advisor_insights enable row level security;

create policy "advisor_insights_select_own" on public.advisor_insights
  for select to authenticated using (user_id = (select auth.uid()));
create policy "advisor_insights_insert_own" on public.advisor_insights
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "advisor_insights_delete_own" on public.advisor_insights
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.advisor_insights from anon, authenticated;
grant select, insert, delete on public.advisor_insights to authenticated;
