-- Read-only verification SQL for:
-- supabase/migrations/20260730000000_006_founder_dashboard_metrics_rpc.sql
--
-- Run in a trusted Supabase SQL session after deploying the migration.
-- Replace the placeholder UUIDs before running the role-simulation blocks.
-- Do not insert admin users here. Founder/admin membership must be provisioned by
-- a controlled migration or server-side administrative process.

-- 1. Confirm the public RPC exposes only aggregate fields.
select
  p.proname as function_name,
  pg_get_function_result(p.oid) as result_shape,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_founder_dashboard_metrics';

-- 2. Confirm execute is not granted to public or anon, and is granted to authenticated.
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'get_founder_dashboard_metrics'
order by grantee, privilege_type;

-- 3. Confirm admin membership RLS is enabled and has only owner-read client access.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  p.policyname,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname = 'admin_users'
order by p.policyname;

-- 4. Confirm existing protected-table policies remain owner-scoped or insert-only.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('waitlist_leads', 'profiles', 'subscriptions')
order by tablename, policyname;

-- 5. Anon cannot execute the RPC.
begin;
  set local role anon;
  select public.get_founder_dashboard_metrics();
rollback;
-- Expected: permission denied for function get_founder_dashboard_metrics.

-- 6. Authenticated non-admin cannot receive metrics.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  select public.get_founder_dashboard_metrics();
rollback;
-- Expected: Founder dashboard metrics access denied.

-- 7. Founder/admin can receive exactly one aggregate row.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<FOUNDATION_PROVISIONED_FOUNDER_OR_ADMIN_UUID>', true);
  select count(*) as aggregate_row_count
  from public.get_founder_dashboard_metrics();
rollback;
-- Expected after provisioning: aggregate_row_count = 1.

-- 8. Existing profile owner-read policy still works.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<EXISTING_AUTH_USER_UUID>', true);
  select count(*) <= 1 as profile_owner_read_limited
  from public.profiles;
rollback;

-- 9. Existing subscription owner-read policy still works.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<EXISTING_AUTH_USER_UUID>', true);
  select bool_and(user_id = auth.uid()) as subscription_owner_read_limited
  from public.subscriptions;
rollback;

-- 10. waitlist_leads still has no general SELECT access.
begin;
  set local role anon;
  select count(*) from public.waitlist_leads;
rollback;
-- Expected: permission denied for table waitlist_leads.
