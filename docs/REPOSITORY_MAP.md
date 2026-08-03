# Repository Map

## Mobile App

Repository: `Leospx22/zerei-rotas-app`

Primary implementation tool: Codex

Owns:

- Android application code
- Mobile route execution, import, profile, occurrence, map, and persistence flows
- Shared backend contracts and tests
- All production Supabase migrations

## Landing Page

Repository: `Leospx22/zerei-rotas-landing-page`

Primary implementation tool: Bolt

Owns:

- Public marketing page
- Public waitlist form UI
- Landing-page copy, layout, and marketing assets

Consumes:

- Existing Supabase tables and public insert contract

Does not own:

- Production Supabase migrations
- Mobile application code

## Shared Backend

Supabase project: `xmtvjzwcfvjkiaplaiay`

Production migrations are owned by `Leospx22/zerei-rotas-app`.

The landing page may insert into the approved public waitlist tables, but schema changes and RLS policy changes belong in the mobile app repository migration history.

## Founder Dashboard

Repository: `Leospx22/zerei-rotas-admin`

Owns:

- Browser dashboard UI
- Founder/admin dashboard presentation

Consumes:

- `public.get_founder_dashboard_metrics()`
- Public Supabase anon key
- Authenticated founder/admin session

Does not own:

- Production Supabase migrations
- Direct table grants for `waitlist_leads`, `profiles`, or `subscriptions`
- Service-role access in the browser

Founder Dashboard aggregate authorization is owned by `Leospx22/zerei-rotas-app` through the `public.admin_users` table and private authorization helper.

## Golden Rule

Before editing, confirm repository, branch, and environment.
