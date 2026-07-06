
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  city text,
  state text,
  vehicle_type text,
  main_platform text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_status text not null default 'none'
    check (subscription_status in ('trial', 'active', 'expired', 'canceled', 'none')),
  funnel_stage text not null default 'registered'
    check (funnel_stage in ('registered', 'trial_active', 'trial_expired', 'subscribed', 'canceled', 'churned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'none',
  plan_id text,
  price_cents integer,
  currency text,
  started_at timestamptz,
  expires_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_funnel_events_user_id_idx
  on public.user_funnel_events(user_id, created_at desc);
create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

alter table public.profiles enable row level security;
alter table public.user_funnel_events enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "funnel_events_select_own"
  on public.user_funnel_events for select to authenticated
  using (auth.uid() = user_id);
create policy "funnel_events_insert_own"
  on public.user_funnel_events for insert to authenticated
  with check (auth.uid() = user_id);

create policy "subscriptions_select_own"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

-- Subscription writes intentionally have no client policy. A trusted server using
-- the service role will own billing updates in a later sprint.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  started_at timestamptz := now();
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    trial_started_at,
    trial_ends_at,
    subscription_status,
    funnel_stage
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    started_at,
    started_at + interval '7 days',
    'trial',
    'trial_active'
  ) on conflict (id) do nothing;

  insert into public.user_funnel_events (user_id, event_type, event_data, created_at)
  values
    (new.id, 'user_registered', '{}'::jsonb, started_at),
    (new.id, 'trial_started', jsonb_build_object('trial_days', 7), started_at);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
