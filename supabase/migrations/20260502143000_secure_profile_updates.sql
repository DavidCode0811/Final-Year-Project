/*
  # Secure Student Profile Updates

  1. Add optional `registration_number` support for student profile display.
  2. Restrict authenticated self-service updates on `users` to safe columns.
  3. Keep existing row-level ownership policy in place so users can only touch their own row.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS registration_number text;

CREATE UNIQUE INDEX IF NOT EXISTS users_registration_number_unique
  ON public.users (registration_number)
  WHERE registration_number IS NOT NULL;

REVOKE UPDATE ON public.users FROM anon;
REVOKE UPDATE ON public.users FROM authenticated;

GRANT UPDATE (name, email) ON public.users TO authenticated;
