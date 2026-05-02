/*
  # Secure Student Profile Updates

  1. Restrict authenticated self-service updates on `users` to safe columns.
  2. Keep existing row-level ownership policy in place so users can only touch their own row.
*/

REVOKE UPDATE ON public.users FROM anon;
REVOKE UPDATE ON public.users FROM authenticated;

GRANT UPDATE (name, email) ON public.users TO authenticated;
