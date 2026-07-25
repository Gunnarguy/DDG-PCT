-- Keep the allowlist trigger-only and make the access-request check use the
-- planner-friendly scalar Auth helper.

drop policy if exists "signed in users can request access"
on public.access_requests;

create policy "signed in users can request access"
on public.access_requests
for insert
to authenticated
with check (
  email = (select lower(auth.email()))
);

drop policy if exists "admins can view allowlist"
on public.allowed_emails;

revoke select on public.allowed_emails from authenticated;
