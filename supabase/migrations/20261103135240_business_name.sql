-- Business name shown in the header instead of the Google name (PRD 4.1)

alter table public.profiles
  add column business_name text,
  add constraint profiles_business_name_valid check (
    business_name is null
    or (business_name = btrim(business_name) and char_length(business_name) between 1 and 100)
  );

-- The user can edit it; name and email stay read-only
grant update (business_name) on public.profiles to authenticated;
