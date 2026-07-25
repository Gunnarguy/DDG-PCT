-- Keep Auth JWT evaluation out of the row expression so PostgreSQL can cache
-- the caller identity once per statement.

create or replace function private.current_auth_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(auth.jwt() ->> 'email');
$$;

revoke all on function private.current_auth_email() from public, anon;
grant execute on function private.current_auth_email() to authenticated;

drop policy if exists "signed in users can request access"
on public.access_requests;

create policy "signed in users can request access"
on public.access_requests
for insert
to authenticated
with check (
  email = (select private.current_auth_email())
);
