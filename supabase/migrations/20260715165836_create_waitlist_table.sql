/*
# Create waitlist table (single-tenant, no auth)

1. New Tables
- `waitlist`
  - `id` (uuid, primary key)
  - `name` (text, not null) — driver's full name
  - `whatsapp` (text, not null) — contact number for beta invite
  - `email` (text, nullable) — optional email
  - `city` (text, nullable) — optional city
  - `platform` (text, nullable) — primary delivery platform (shopee, mercadolivre, amazon, loggi, outra)
  - `consent` (boolean, not null, default false) — consent to be contacted about the free test
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `waitlist`.
- This is a no-auth landing page: the anon-key frontend inserts waitlist sign-ups.
- INSERT open to anon + authenticated (anyone can join the waitlist).
- SELECT / UPDATE / DELETE restricted to authenticated (only project admins in the Supabase dashboard can read or manage entries — the public anon client cannot read other people's submissions).

3. Notes
- No `user_id` column: there is no sign-in flow, so no ownership relationship to auth.users.
- Unique constraint on `whatsapp` prevents duplicate sign-ups from the same number.
*/

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  city text,
  platform text,
  consent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
-- Unique constraint on whatsapp (drop first for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_whatsapp_key'
  ) THEN
    ALTER TABLE waitlist ADD CONSTRAINT waitlist_whatsapp_key UNIQUE (whatsapp);
  END IF;
END $$;
-- INSERT: anyone (anon + authenticated) can join the waitlist
DROP POLICY IF EXISTS "insert_waitlist" ON waitlist;
CREATE POLICY "insert_waitlist"
ON waitlist FOR INSERT
TO anon, authenticated
WITH CHECK (true);
-- SELECT: only authenticated dashboard users can read entries
DROP POLICY IF EXISTS "select_waitlist_authenticated" ON waitlist;
CREATE POLICY "select_waitlist_authenticated"
ON waitlist FOR SELECT
TO authenticated
USING (true);
-- UPDATE: only authenticated dashboard users can manage entries
DROP POLICY IF EXISTS "update_waitlist_authenticated" ON waitlist;
CREATE POLICY "update_waitlist_authenticated"
ON waitlist FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);
-- DELETE: only authenticated dashboard users can remove entries
DROP POLICY IF EXISTS "delete_waitlist_authenticated" ON waitlist;
CREATE POLICY "delete_waitlist_authenticated"
ON waitlist FOR DELETE
TO authenticated
USING (true);
