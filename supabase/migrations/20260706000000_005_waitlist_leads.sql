create table if not exists public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  whatsapp text not null check (length(regexp_replace(whatsapp, '\D', '', 'g')) >= 10),
  whatsapp_normalized text generated always as (
    regexp_replace(whatsapp, '\D', '', 'g')
  ) stored,
  email text check (
    email is null
    or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  city text,
  main_platform text not null check (
    main_platform in ('Shopee', 'Mercado Livre', 'Amazon', 'Loggi', 'Outra')
  ),
  source text not null default 'landing_page',
  status text not null default 'new' check (
    status in (
      'new',
      'contacted',
      'invited',
      'registered',
      'trial_active',
      'purchased',
      'not_qualified',
      'unsubscribed'
    )
  ),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  invited_at timestamptz,
  converted_user_id uuid references auth.users(id) on delete set null
);

create unique index if not exists waitlist_leads_whatsapp_normalized_key
  on public.waitlist_leads(whatsapp_normalized);
create index if not exists waitlist_leads_created_at_idx
  on public.waitlist_leads(created_at desc);
create index if not exists waitlist_leads_status_idx
  on public.waitlist_leads(status);

create table if not exists public.waitlist_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.waitlist_leads(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_lead_events_lead_id_idx
  on public.waitlist_lead_events(lead_id, created_at desc);

alter table public.waitlist_leads enable row level security;
alter table public.waitlist_lead_events enable row level security;

revoke all on table public.waitlist_leads from anon, authenticated;
revoke all on table public.waitlist_lead_events from anon, authenticated;
grant insert (name, whatsapp, email, city, main_platform, source, metadata)
  on table public.waitlist_leads to anon;

create policy "waitlist_leads_anon_insert"
  on public.waitlist_leads
  for insert
  to anon
  with check (
    status = 'new'
    and source = 'landing_page'
    and notes is null
    and converted_user_id is null
    and length(trim(name)) > 0
    and length(regexp_replace(whatsapp, '\D', '', 'g')) >= 10
    and main_platform in ('Shopee', 'Mercado Livre', 'Amazon', 'Loggi', 'Outra')
  );

-- No public policies are intentionally created for selecting, updating, or
-- deleting leads, or for accessing lead events directly.

create or replace function public.set_waitlist_lead_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_waitlist_lead_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.waitlist_lead_events (lead_id, event_type, event_data)
  values (
    new.id,
    'lead_created',
    jsonb_build_object(
      'source', new.source,
      'main_platform', new.main_platform
    )
  );
  return new;
end;
$$;

revoke all on function public.set_waitlist_lead_updated_at() from public, anon, authenticated;
revoke all on function public.record_waitlist_lead_created() from public, anon, authenticated;

drop trigger if exists set_waitlist_lead_updated_at on public.waitlist_leads;
create trigger set_waitlist_lead_updated_at
  before update on public.waitlist_leads
  for each row execute procedure public.set_waitlist_lead_updated_at();

drop trigger if exists on_waitlist_lead_created on public.waitlist_leads;
create trigger on_waitlist_lead_created
  after insert on public.waitlist_leads
  for each row execute procedure public.record_waitlist_lead_created();
