-- Read-only verification SQL for:
-- supabase/migrations/20260804000000_007_founder_users_rpc.sql
--
-- Run in a trusted Supabase SQL session after deploying the migration.
-- Replace the placeholder UUIDs before running the role-simulation blocks.
-- Do not insert admin users here. Founder/admin membership must be provisioned by
-- a controlled migration or server-side administrative process.

-- 1. Confirm the public RPC exposes only the Founder Users page fields.
select
  p.proname as function_name,
  pg_get_function_result(p.oid) as result_shape,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_founder_users';

-- Expected result_shape:
-- TABLE(user_id uuid, name text, email text, plan text, status text,
-- trial_start timestamp with time zone, trial_end timestamp with time zone,
-- created_at timestamp with time zone)
-- Expected security_definer: true.
-- Expected function_settings includes search_path=pg_catalog.

-- 2. Confirm execute is not granted to public or anon, and is granted only to authenticated.
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'get_founder_users'
order by grantee, privilege_type;

-- 3. Confirm private founder/admin authorization helper is still protected.
select
  p.proname as function_name,
  pg_get_function_result(p.oid) as result_shape,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname = 'is_founder_or_admin';

select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'private'
  and routine_name = 'is_founder_or_admin'
order by grantee, privilege_type;

-- 4. Confirm existing protected-table policies remain owner-scoped.
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
  and tablename in ('admin_users', 'profiles', 'subscriptions')
order by tablename, policyname;

-- 5. Confirm no direct table grants were added for Founder Users access.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'subscriptions')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 6. Anon cannot execute the RPC.
begin;
  set local role anon;
  select public.get_founder_users();
rollback;
-- Expected: permission denied for function get_founder_users.

-- 7. Authenticated non-admin cannot receive users.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  select public.get_founder_users();
rollback;
-- Expected: Founder users access denied.

-- 8. Founder/admin receives only the approved columns.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<PROVISIONED_FOUNDER_OR_ADMIN_UUID>', true);
  select *
  from public.get_founder_users()
  limit 5;
rollback;
-- Expected after provisioning: rows contain only user_id, name, email, plan,
-- status, trial_start, trial_end, and created_at.

-- 9. Existing profile owner-read policy still works.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<EXISTING_AUTH_USER_UUID>', true);
  select bool_and(id = auth.uid()) as profile_owner_read_limited
  from public.profiles;
rollback;

-- 10. Existing subscription owner-read policy still works.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<EXISTING_AUTH_USER_UUID>', true);
  select bool_and(user_id = auth.uid()) as subscription_owner_read_limited
  from public.subscriptions;
rollback;
