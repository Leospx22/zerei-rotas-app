create or replace function public.get_founder_users()
returns table (
  user_id uuid,
  name text,
  email text,
  plan text,
  status text,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or not private.is_founder_or_admin() then
    raise exception 'Founder users access denied'
      using errcode = '42501';
  end if;

  return query
  with latest_subscriptions as (
    select distinct on (subscription.user_id)
      subscription.user_id,
      subscription.status,
      subscription.plan_id
    from public.subscriptions as subscription
    order by
      subscription.user_id,
      subscription.updated_at desc,
      subscription.created_at desc
  )
  select
    profile.id as user_id,
    coalesce(nullif(btrim(profile.full_name), ''), 'Sem nome') as name,
    coalesce(nullif(btrim(profile.email), ''), '') as email,
    coalesce(
      nullif(btrim(latest_subscription.plan_id), ''),
      case
        when coalesce(latest_subscription.status, profile.subscription_status) = 'active' then 'premium'
        when coalesce(latest_subscription.status, profile.subscription_status) = 'trial' then 'trial'
        when coalesce(latest_subscription.status, profile.subscription_status) = 'none' then 'free'
        else null
      end,
      'unknown'
    ) as plan,
    coalesce(
      nullif(btrim(latest_subscription.status), ''),
      nullif(btrim(profile.subscription_status), ''),
      nullif(btrim(profile.funnel_stage), ''),
      'unknown'
    ) as status,
    profile.trial_started_at as trial_start,
    profile.trial_ends_at as trial_end,
    profile.created_at
  from public.profiles as profile
  left join latest_subscriptions as latest_subscription
    on latest_subscription.user_id = profile.id
  order by profile.created_at desc;
end;
$$;

alter function public.get_founder_users() owner to postgres;

comment on function public.get_founder_users() is
  'Founder/admin-only users list for the Founder Users page. Returns only required business fields from profiles plus the latest subscription plan/status.';

revoke all on function public.get_founder_users() from public, anon, authenticated;
grant execute on function public.get_founder_users() to authenticated;
