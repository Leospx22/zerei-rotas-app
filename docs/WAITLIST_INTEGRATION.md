# Waitlist Integration

## Purpose

This is the backend and client foundation for collecting delivery-driver leads from the separately maintained Zerei Rotas landing page. It does not connect the Bolt landing page yet and does not add any app screen.

The public form captures:

- Nome
- WhatsApp
- E-mail (optional)
- Cidade (optional)
- Plataforma principal

## Database Tables

### `public.waitlist_leads`

Stores the current lead record, normalized WhatsApp identity, source, qualification status, optional operational notes, timestamps, and an optional future link to `auth.users`.

Allowed lead statuses:

```text
new -> contacted -> invited -> registered -> trial_active -> purchased
```

Operational alternatives are `not_qualified` and `unsubscribed`.

Allowed platform values are `Shopee`, `Mercado Livre`, `Amazon`, `Loggi`, and `Outra`.

### `public.waitlist_lead_events`

Stores the lead audit trail. The database automatically creates a `lead_created` event after a lead insert, including its source and main platform.

## Security Model

- Anonymous landing-page visitors may only insert a lead that satisfies the approved public constraints.
- Anonymous visitors cannot read, update, or delete leads.
- Anonymous visitors cannot access lead events directly.
- Regular authenticated app users cannot read the lead list or events.
- The trigger that creates `lead_created` runs as a constrained security-definer function.
- Supabase Dashboard and trusted server-side service-role processes may manage leads.
- The service-role key must never be placed in Expo, Bolt client code, browser variables, or committed files.
- Existing profile, funnel, route, and subscription policies are unchanged.

The public insert must retain `source = 'landing_page'`, `status = 'new'`, null operational notes, and no converted user. The client helper sends only the public form fields, safe source, and empty metadata.

## Deploy the Migration

Migration:

```text
supabase/migrations/20260706000000_005_waitlist_leads.sql
```

Deploy with the established Supabase migration workflow or manually:

1. Open the correct Zerei Rotas project in Supabase Dashboard.
2. Open SQL Editor.
3. Copy the complete local migration SQL content, not the Windows file path.
4. Paste and review the SQL.
5. Run it only after confirming the correct project.
6. Confirm both tables exist.
7. Confirm RLS is enabled on both tables.
8. Confirm only the anonymous lead-insert policy exists for public access.

## Verification Queries

Run from trusted Supabase SQL Editor access:

```sql
select id, name, whatsapp, email, city, main_platform, source, status, created_at
from public.waitlist_leads
order by created_at desc
limit 20;
```

```sql
select lead_id, event_type, event_data, created_at
from public.waitlist_lead_events
order by created_at desc
limit 20;
```

Before the landing page is connected, both queries may return no rows.

## Bolt Connection Plan

The Bolt landing page should later use the same validation and payload contract as `lib/waitlistLeads.ts`:

1. Collect the five public fields.
2. Normalize and validate WhatsApp.
3. Validate optional email.
4. Restrict the platform to an allowed value.
5. Insert the safe payload into `public.waitlist_leads` using the public anon key.
6. Show the Portuguese friendly result without attempting to read the inserted row.

If the landing page can consume shared project code, call `submitWaitlistLead()`. Otherwise, reproduce only the documented safe payload contract and validation rules. Never send `status`, `notes`, operational timestamps, or `converted_user_id` from the public form.

## Known Limitations

- Payments are not active.
- There is no admin dashboard.
- There is no spam, rate-limit, or CAPTCHA protection yet.
- There is no automated email or WhatsApp outreach.
- The landing page is not connected in this sprint.
- Operational status changes require trusted Dashboard or server-side access.
