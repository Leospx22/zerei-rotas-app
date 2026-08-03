create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
alter schema private owner to postgres;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('founder', 'admin', 'support'))
);

alter table public.admin_users
  add column if not exists role text not null,
  add column if not exists is_enabled boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_role_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_role_check
      check (role in ('founder', 'admin', 'support'));
  end if;
end;
$$;

alter table public.admin_users owner to postgres;
alter table public.admin_users enable row level security;

revoke all on table public.admin_users from public, anon, authenticated;
grant select on table public.admin_users to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'admin_users_select_own'
  ) then
    create policy "admin_users_select_own"
      on public.admin_users
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end;
$$;

create or replace function private.is_founder_or_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.admin_users as admin_user
      where admin_user.user_id = auth.uid()
        and admin_user.is_enabled = true
        and admin_user.role in ('founder', 'admin')
    ),
    false
  );
$$;

alter function private.is_founder_or_admin() owner to postgres;
revoke all on function private.is_founder_or_admin() from public, anon, authenticated;

create or replace function public.get_founder_dashboard_metrics()
returns table (
  total_waitlist bigint,
  new_waitlist_today bigint,
  registered_users bigint,
  trial_users bigint,
  premium_users bigint,
  mrr_cents bigint,
  generated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or not private.is_founder_or_admin() then
    raise exception 'Founder dashboard metrics access denied'
      using errcode = '42501';
  end if;

  return query
  with premium_subscription_metrics as (
    select count(*)::bigint as premium_users
    from public.subscriptions
    where status = 'active'
  )
  select
    (select count(*)::bigint from public.waitlist_leads) as total_waitlist,
    (
      select count(*)::bigint
      from public.waitlist_leads
      where created_at >= date_trunc('day', now())
    ) as new_waitlist_today,
    (select count(*)::bigint from public.profiles) as registered_users,
    (
      select count(*)::bigint
      from public.subscriptions
      where status = 'trial'
    ) as trial_users,
    premium_subscription_metrics.premium_users,
    (premium_subscription_metrics.premium_users * 990::bigint) as mrr_cents,
    now() as generated_at
  from premium_subscription_metrics;
end;
$$;

alter function public.get_founder_dashboard_metrics() owner to postgres;

comment on function public.get_founder_dashboard_metrics() is
  'Founder/admin-only aggregate dashboard metrics. MRR currently uses temporary fixed pricing of 990 cents per active subscription until plan pricing or subscriptions.price_cents becomes authoritative.';

revoke all on function public.get_founder_dashboard_metrics() from public, anon, authenticated;
grant execute on function public.get_founder_dashboard_metrics() to authenticated;
