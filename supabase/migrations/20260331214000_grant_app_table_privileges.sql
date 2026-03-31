/*
  # Grant App Table Privileges

  The app currently uses:
  - the anon key for client-side Supabase access
  - the service_role key for server-side API routes

  If the underlying Postgres roles do not have table privileges, Supabase
  returns errors like:
    permission denied for table exams

  This migration grants the required privileges to the Supabase roles used by
  the app and sets default privileges for future tables and sequences.
*/

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO anon, authenticated, service_role;
