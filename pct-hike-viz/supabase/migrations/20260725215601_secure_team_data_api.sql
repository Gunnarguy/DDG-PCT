-- DDG Mission Control: make Supabase Auth + team profiles the authorization
-- source of truth and remove legacy anonymous access.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_ddg_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ddg_team_profiles
    where id = (select auth.uid())
  );
$$;

create or replace function private.is_ddg_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ddg_team_profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_ddg_team_member() from public, anon;
revoke all on function private.is_ddg_admin() from public, anon;
grant execute on function private.is_ddg_team_member() to authenticated;
grant execute on function private.is_ddg_admin() to authenticated;

-- Repair profiles for any allowlisted Auth users who predate the signup trigger.
insert into public.ddg_team_profiles (id, email, hiker_id, name, role)
select
  users.id,
  lower(users.email),
  allowed.hiker_id,
  allowed.name,
  coalesce(allowed.role, 'member')
from auth.users as users
join public.allowed_emails as allowed
  on lower(allowed.email) = lower(users.email)
where users.email is not null
on conflict (id) do update
set
  email = excluded.email,
  hiker_id = excluded.hiker_id,
  name = excluded.name,
  role = excluded.role;

-- Normalize the signup trigger so new allowlisted users always receive the
-- database role recorded in allowed_emails.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_record public.allowed_emails%rowtype;
begin
  select *
    into allowed_record
  from public.allowed_emails
  where lower(email) = lower(new.email);

  if found then
    insert into public.ddg_team_profiles (id, email, hiker_id, name, role)
    values (
      new.id,
      lower(new.email),
      allowed_record.hiker_id,
      allowed_record.name,
      coalesce(allowed_record.role, 'member')
    )
    on conflict (id) do update
    set
      email = excluded.email,
      hiker_id = excluded.hiker_id,
      name = excluded.name,
      role = excluded.role;
  else
    insert into public.access_requests (email)
    values (lower(new.email))
    on conflict (email) do nothing;
  end if;

  return new;
end;
$$;

-- Remove every legacy policy. PostgreSQL combines permissive policies with OR,
-- so one old `using (true)` policy would otherwise bypass the secure policies.
drop policy if exists "access_requests_insert" on public.access_requests;
drop policy if exists "access_requests_select_admin" on public.access_requests;
drop policy if exists "Admins can manage access requests" on public.access_requests;
drop policy if exists "Admins can view access requests" on public.access_requests;
drop policy if exists "Auth users can insert matching email" on public.access_requests;

drop policy if exists "allowed_emails_select_all" on public.allowed_emails;

drop policy if exists "custom_items_insert_all" on public.custom_items;
drop policy if exists "custom_items_select_all" on public.custom_items;
drop policy if exists "custom_items_update_all" on public.custom_items;

drop policy if exists "DDG team can view all profiles" on public.ddg_team_profiles;
drop policy if exists "Users can update own profile" on public.ddg_team_profiles;
drop policy if exists "Users can view own profile" on public.ddg_team_profiles;
drop policy if exists "ddg_team_profiles_select_all" on public.ddg_team_profiles;
drop policy if exists "ddg_team_profiles_select_own" on public.ddg_team_profiles;

drop policy if exists "gear_loadouts_select_all" on public.gear_loadouts;
drop policy if exists "gear_loadouts_update_all" on public.gear_loadouts;
drop policy if exists "gear_loadouts_upsert_all" on public.gear_loadouts;

drop policy if exists "ops_logs_insert_all" on public.ops_logs;
drop policy if exists "ops_logs_select_all" on public.ops_logs;
drop policy if exists "ops_logs_update_status" on public.ops_logs;

alter table public.access_requests enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.custom_items enable row level security;
alter table public.ddg_team_profiles enable row level security;
alter table public.gear_loadouts enable row level security;
alter table public.ops_logs enable row level security;

create policy "signed in users can request access"
on public.access_requests
for insert
to authenticated
with check (
  email = lower((select auth.jwt() ->> 'email'))
);

create policy "admins can view access requests"
on public.access_requests
for select
to authenticated
using ((select private.is_ddg_admin()));

create policy "admins can update access requests"
on public.access_requests
for update
to authenticated
using ((select private.is_ddg_admin()))
with check ((select private.is_ddg_admin()));

create policy "admins can view allowlist"
on public.allowed_emails
for select
to authenticated
using ((select private.is_ddg_admin()));

create policy "team can view profiles"
on public.ddg_team_profiles
for select
to authenticated
using ((select private.is_ddg_team_member()));

create policy "users can update own presence"
on public.ddg_team_profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "team can view gear loadouts"
on public.gear_loadouts
for select
to authenticated
using ((select private.is_ddg_team_member()));

create policy "team can create gear loadouts"
on public.gear_loadouts
for insert
to authenticated
with check ((select private.is_ddg_team_member()));

create policy "team can update gear loadouts"
on public.gear_loadouts
for update
to authenticated
using ((select private.is_ddg_team_member()))
with check ((select private.is_ddg_team_member()));

create policy "team can view custom gear"
on public.custom_items
for select
to authenticated
using ((select private.is_ddg_team_member()));

create policy "team can create custom gear"
on public.custom_items
for insert
to authenticated
with check ((select private.is_ddg_team_member()));

create policy "team can update custom gear"
on public.custom_items
for update
to authenticated
using ((select private.is_ddg_team_member()))
with check ((select private.is_ddg_team_member()));

create policy "team can view ops log"
on public.ops_logs
for select
to authenticated
using ((select private.is_ddg_team_member()));

create policy "team can create ops log entries"
on public.ops_logs
for insert
to authenticated
with check ((select private.is_ddg_team_member()));

create policy "team can update ops status"
on public.ops_logs
for update
to authenticated
using ((select private.is_ddg_team_member()))
with check ((select private.is_ddg_team_member()));

-- Grants define the reachable API surface; RLS then limits rows.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke all on public.access_requests from authenticated;
revoke all on public.allowed_emails from authenticated;
revoke all on public.custom_items from authenticated;
revoke all on public.ddg_team_profiles from authenticated;
revoke all on public.gear_loadouts from authenticated;
revoke all on public.ops_logs from authenticated;

grant select, insert, update on public.access_requests to authenticated;
grant select on public.allowed_emails to authenticated;
grant select, insert, update on public.custom_items to authenticated;
grant select on public.ddg_team_profiles to authenticated;
grant update (last_seen) on public.ddg_team_profiles to authenticated;
grant select, insert on public.gear_loadouts to authenticated;
grant update (item_ids, updated_at) on public.gear_loadouts to authenticated;
grant select, insert on public.ops_logs to authenticated;
grant update (status) on public.ops_logs to authenticated;

grant usage, select on sequence public.access_requests_id_seq to authenticated;
grant usage, select on sequence public.custom_items_id_seq to authenticated;
grant usage, select on sequence public.ops_logs_id_seq to authenticated;

-- Trigger-only and legacy helper functions are not public API endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_last_seen() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.is_ddg_admin() from public, anon, authenticated;
revoke execute on function public.is_ddg_team_member() from public, anon, authenticated;
revoke execute on function public.approve_access_request(text, text, text) from public, anon, authenticated;
revoke execute on function public.deny_access_request(text, text) from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
