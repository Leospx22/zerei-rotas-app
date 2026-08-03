# Founder Dashboard Metrics RPC

## Purpose

`zerei-rotas-app` owns the production Supabase migration that exposes Founder Dashboard aggregate metrics. The separate `zerei-rotas-admin` browser dashboard consumes the RPC with the public Supabase anon key plus an authenticated founder/admin user session.

The dashboard must never embed or request the Supabase `service_role` key.

## Migration

```text
supabase/migrations/20260730000000_006_founder_dashboard_metrics_rpc.sql
```

The migration creates:

- `public.admin_users`
- `private.is_founder_or_admin()`
- `public.get_founder_dashboard_metrics()`

`public.admin_users` is an RLS-protected membership table. Authenticated users may read only their own membership row. There are no client-side insert, update, or delete policies for admin membership.

Admin membership must be provisioned by a controlled migration or server-side administrative process. Do not add a founder row until the exact production `auth.users.id` UUID is known.

## Authorization Model

`public.get_founder_dashboard_metrics()`:

- Requires `auth.uid()`.
- Calls the private authorization helper internally.
- Accepts only enabled `founder` and `admin` roles.
- Does not grant aggregate financial access to `support`.
- Does not trust browser-supplied role parameters, user metadata, or JWT role labels.
- Raises `Founder dashboard metrics access denied` with SQLSTATE `42501` when unauthorized.

The helper and RPC are `SECURITY DEFINER` functions with explicit `search_path = pg_catalog` and schema-qualified table references. The authorization check runs before any aggregate table query.

## Returned Metrics

The RPC returns exactly one aggregate row:

- `total_waitlist`
- `new_waitlist_today`
- `registered_users`
- `trial_users`
- `premium_users`
- `mrr_cents`
- `generated_at`

No individual names, emails, phone numbers, UUIDs, notes, lead records, profile rows, or subscription records are returned.

`mrr_cents` currently uses the temporary fixed value `premium_users * 990`. A later billing sprint should replace this with authoritative plan pricing or `subscriptions.price_cents`.

## Grants And Revokes

- `public.admin_users`: all privileges revoked from `public`, `anon`, and `authenticated`, then `select` granted only to `authenticated`.
- `private.is_founder_or_admin()`: execute revoked from `public`, `anon`, and `authenticated`.
- `public.get_founder_dashboard_metrics()`: execute revoked from `public`, `anon`, and `authenticated`, then granted only to `authenticated`.
- `private` schema usage is revoked from `public`, `anon`, and `authenticated`.

The migration does not grant direct read access to:

- `public.waitlist_leads`
- `public.profiles`
- `public.subscriptions`

Existing RLS policies on those tables remain unchanged.

## Verification

Read-only verification SQL:

```text
supabase/verification/20260730000000_006_founder_dashboard_metrics_verification.sql
```

It verifies:

- Anon cannot execute the RPC.
- Authenticated non-admin users cannot receive metrics.
- A provisioned founder/admin receives exactly one aggregate row.
- The RPC shape exposes aggregate fields only.
- Existing profile owner-read policy still works.
- Existing subscription owner-read policy still works.
- `waitlist_leads` still has no general select access.
- The frontend needs no `service_role` key.

Do not weaken RLS for verification.

## Deployment Steps

1. Confirm the target project is the production Zerei Rotas Supabase project.
2. Open `supabase/migrations/20260730000000_006_founder_dashboard_metrics_rpc.sql`.
3. Copy the complete SQL content.
4. Paste it into Supabase SQL Editor for the correct project.
5. Review grants, revokes, `SECURITY DEFINER`, `search_path`, and protected-table references.
6. Run the migration once.
7. Provision the founder/admin membership separately only after the exact production `auth.users.id` UUID is known.
8. Run the read-only verification SQL, replacing placeholder UUIDs where requested.
9. Configure `zerei-rotas-admin` to call `public.get_founder_dashboard_metrics()` through the browser Supabase client using the anon key and authenticated session.
10. Confirm no frontend environment contains `service_role`.
