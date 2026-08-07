# Supabase Setup Guide

This guide explains how to configure, deploy, and validate the Supabase backend for Zerei Rotas. It is intended to be repeatable by a founder or developer without exposing private credentials.

## 1. Environment Variables

The Expo application uses these frontend-safe variables:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Create or update `.env.local` in the repository root. Do not commit that file. The committed `.env.example` contains placeholders and is safe to keep in Git.

Never place a Supabase `service_role` key in Expo code, an `EXPO_PUBLIC_*` variable, logs, screenshots, or a committed file. The service-role key bypasses Row Level Security and must remain server-side.

Restart Expo after changing `.env.local` so Metro reloads the environment variables.

## 2. Verify `.env.local` Safely

From PowerShell in the repository root, confirm that the file exists and contains both variable names without printing their values:

```powershell
$file = '.env.local'
$content = if (Test-Path $file) { Get-Content $file } else { @() }

[pscustomobject]@{
  FileExists = Test-Path $file
  HasSupabaseUrl = [bool]($content -match '^\s*EXPO_PUBLIC_SUPABASE_URL\s*=\s*\S+')
  HasSupabaseAnonKey = [bool]($content -match '^\s*EXPO_PUBLIC_SUPABASE_ANON_KEY\s*=\s*\S+')
}
```

Confirm that Git ignores the private file:

```powershell
git check-ignore .env.local
git ls-files .env.local
```

Expected result:

- `git check-ignore` prints `.env.local`.
- `git ls-files` prints nothing.

The app intentionally enters a safe offline/account-unconfigured state when either variable is missing. Local route features remain available.

## 3. Deploy the Migration Manually

The migration to deploy is:

```text
supabase/migrations/20260705000000_004_auth_profile_foundation.sql
```

Deployment steps:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the correct **Zerei Rotas** project.
3. Open **SQL Editor**.
4. Open the migration file locally in an editor.
5. Copy the complete SQL content from the file.
6. Paste the SQL content into a new SQL Editor query.
7. Review the selected project name and URL before running it.
8. Click **Run**.
9. If Supabase shows a destructive-operation warning, accept it only after confirming this is the intended Zerei Rotas project and the pasted SQL is the approved migration.
10. Confirm that the query completes successfully and verify the objects below.

Do not paste the Windows file path into SQL Editor. SQL Editor requires the contents of the `.sql` file, not a path such as `C:\Users\...`. Do not rerun a partially applied migration blindly; inspect existing objects and the reported SQL error first.

## 4. Expected Migration Objects

The migration creates:

- `public.profiles`
- `public.user_funnel_events`
- `public.subscriptions`
- Row Level Security policies that scope profile, funnel, and subscription reads to the authenticated owner
- An `auth.users` trigger that creates the initial profile and funnel events
- A seven-day trial using `trial_started_at` and `trial_ends_at`
- Initial `subscription_status = 'trial'`
- Initial `funnel_stage = 'trial_active'`
- `user_registered` and `trial_started` funnel events

The frontend has no insert, update, or delete policy for `public.subscriptions`. Subscription writes remain server-side for a later billing integration.

## 5. Database Verification Queries

Run these queries in Supabase SQL Editor after deployment.

### Profiles

```sql
select
  id,
  email,
  subscription_status,
  funnel_stage,
  trial_started_at,
  trial_ends_at,
  created_at
from public.profiles
order by created_at desc
limit 10;
```

### Funnel events

```sql
select
  user_id,
  event_type,
  event_data,
  created_at
from public.user_funnel_events
order by created_at desc
limit 20;
```

### Subscriptions

```sql
select
  id,
  user_id,
  provider,
  status,
  plan_id,
  created_at
from public.subscriptions
order by created_at desc
limit 10;
```

Before the first registration:

- `profiles` may be empty.
- `user_funnel_events` may be empty.
- `subscriptions` should usually be empty.

## 6. First Real Registration Test

Use a disposable test account rather than a personal production account.

- [ ] Start the app with the configured `.env.local`.
- [ ] Open **Perfil**.
- [ ] Enter a disposable name, email, and password.
- [ ] Tap **Criar conta**.
- [ ] If Supabase email confirmation is enabled, confirm the email and then return to the app.
- [ ] Sign in with the confirmed test account.
- [ ] Confirm that Perfil shows the test email.
- [ ] Fill in Nome, WhatsApp, Cidade, Estado, Tipo de veículo, and Plataforma principal.
- [ ] Tap **Salvar perfil**.
- [ ] Sign out.
- [ ] Sign back in.
- [ ] Confirm that the saved profile data persists.
- [ ] Confirm that Painel, Rotas, Ocorrências, Histórico, and local map features remain usable.

## 7. Expected Result After Registration

### `public.profiles`

There should be exactly one row for the test user's auth UUID:

- `email` matches the disposable test account.
- `subscription_status` is `trial`.
- `funnel_stage` is `trial_active`.
- `trial_started_at` is populated.
- `trial_ends_at` is approximately seven days after `trial_started_at`.
- Saved profile fields persist after signing out and back in.

### `public.user_funnel_events`

The test user should have one initial event of each type:

- `user_registered`
- `trial_started`

Repeated login should not create additional registration or trial-start events. Updating the profile may add `profile_updated` events.

### `public.subscriptions`

There should be no paid subscription row yet. Payments, RevenueCat, and Google Play Billing are not connected in this phase.

## 8. Troubleshooting

### Supabase Dashboard does not load

- Check [Supabase status](https://status.supabase.com/).
- Retry in a private browser window or another browser.
- Disable browser extensions that may block dashboard scripts.
- Wait and retry later rather than repeatedly running an uncertain migration.

### SQL Editor shows `syntax error at or near "C"`

The local Windows file path was pasted instead of SQL. Open the migration file, copy its complete contents, and paste those contents into SQL Editor.

### Supabase shows a destructive-operation warning

The migration replaces the named auth-user trigger so it points to the approved handler. Confirm the dashboard is on the correct project and review the SQL before accepting the warning.

### Email confirmation is required

This depends on the Supabase Auth configuration. The app should display: **Conta criada. Confirme seu e-mail antes de entrar.** Confirm the email, then sign in normally.

### Environment variables are missing

Verify `.env.local` with the masked PowerShell check above, ensure both names are spelled exactly, and restart Expo.

### App shows `Conta ainda não configurada neste ambiente.`

The runtime did not receive one or both public variables. Confirm `.env.local`, stop Metro, and start Expo again. Do not replace the anon key with the service-role key.

### RLS blocks profile updates

- Confirm the user is authenticated and the app session is current.
- Confirm `profiles_update_own` exists on `public.profiles`.
- Confirm the profile `id` equals `auth.uid()`.
- Confirm the full migration completed successfully.
- Do not disable RLS as a shortcut.

### Duplicate profile rows or funnel events

- `profiles.id` is a primary key, so there cannot be two profile rows for one auth UUID.
- The auth trigger should create `user_registered` and `trial_started` only when `auth.users` receives a new row.
- Repeated login should not run the auth-user insert trigger.
- If duplicate funnel events appear, record the affected `user_id`, event types, and timestamps without deleting production data, then investigate before changing the trigger.

## 9. Security Boundaries

- Never commit `.env.local` or other private environment files.
- Never use a Supabase `service_role` key in the Expo frontend.
- The anon key is intended for frontend use, but data access remains protected by RLS.
- Never disable RLS to work around an authentication or policy issue.
- Subscription writes must remain server-side.
- Payment-provider integration belongs to a later approved sprint.
- Do not place passwords, auth tokens, full keys, or private user data in screenshots, logs, issues, or documentation.

## 10. Next Sprints

- **Sprint 4.2A:** Run real Supabase registration/login QA after the migration is deployed, including database verification and session persistence.
- **Sprint 4.3:** Polish profile onboarding and implement server-managed trial expiration.
