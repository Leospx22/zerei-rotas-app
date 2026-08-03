import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260730000000_006_founder_dashboard_metrics_rpc.sql', import.meta.url),
  'utf8'
);

test('founder dashboard migration creates admin membership with owner-read RLS only', () => {
  assert.match(migration, /create table if not exists public\.admin_users/i);
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /check \(role in \('founder', 'admin', 'support'\)\)/i);
  assert.match(migration, /alter table public\.admin_users enable row level security;/i);
  assert.match(migration, /grant select on table public\.admin_users to authenticated;/i);
  assert.match(migration, /create policy "admin_users_select_own"[\s\S]*using \(auth\.uid\(\) = user_id\);/i);
  assert.doesNotMatch(migration, /for (insert|update|delete)[\s\S]*on public\.admin_users/i);
});

test('authorization helper uses authenticated uid and never trusts browser-supplied role data', () => {
  assert.match(migration, /create or replace function private\.is_founder_or_admin\(\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog/i);
  assert.match(migration, /auth\.uid\(\) is not null/i);
  assert.match(migration, /from public\.admin_users as admin_user/i);
  assert.match(migration, /admin_user\.role in \('founder', 'admin'\)/i);
  assert.doesNotMatch(migration, /raw_user_meta_data|user_meta|app_metadata|jwt|role\s*=>/i);
});

test('metrics RPC returns aggregates only and checks authorization before aggregate queries', () => {
  const authCheckIndex = migration.indexOf('if auth.uid() is null or not private.is_founder_or_admin() then');
  const firstAggregateIndex = migration.indexOf('from public.waitlist_leads');
  const rpcBody = migration.slice(
    migration.indexOf('create or replace function public.get_founder_dashboard_metrics()'),
    migration.indexOf('comment on function public.get_founder_dashboard_metrics()')
  );

  assert.notEqual(authCheckIndex, -1);
  assert.notEqual(firstAggregateIndex, -1);
  assert.equal(authCheckIndex < firstAggregateIndex, true);
  assert.match(migration, /returns table \([\s\S]*total_waitlist bigint[\s\S]*generated_at timestamptz[\s\S]*\)/i);
  assert.match(migration, /raise exception 'Founder dashboard metrics access denied'[\s\S]*errcode = '42501'/i);
  assert.match(migration, /premium_subscription_metrics\.premium_users \* 990::bigint/i);
  assert.doesNotMatch(migration, /returns table \([\s\S]*(email|phone|uuid|name|notes)[\s\S]*\)/i);
  assert.doesNotMatch(rpcBody, /\b(insert|update|delete|drop)\s+/i);
  assert.match(migration, /alter function public\.get_founder_dashboard_metrics\(\) owner to postgres;/i);
});

test('metrics RPC is exposed only to authenticated clients', () => {
  assert.match(
    migration,
    /revoke all on function public\.get_founder_dashboard_metrics\(\) from public, anon, authenticated;/i
  );
  assert.match(migration, /grant execute on function public\.get_founder_dashboard_metrics\(\) to authenticated;/i);
  assert.doesNotMatch(migration, /grant execute on function public\.get_founder_dashboard_metrics\(\) to (public|anon)/i);
});

test('migration does not add broad select policies to protected production tables', () => {
  assert.doesNotMatch(migration, /create policy[\s\S]*on public\.waitlist_leads[\s\S]*for select/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*on public\.profiles[\s\S]*for select/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*on public\.subscriptions[\s\S]*for select/i);
  assert.doesNotMatch(migration, /grant select on table public\.(waitlist_leads|profiles|subscriptions)/i);
});
