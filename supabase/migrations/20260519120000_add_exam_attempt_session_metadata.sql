-- Add session metadata and integrity persistence fields to exam attempts.

CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS violation_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tab_switch_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warnings jsonb DEFAULT '[]'::jsonb;

UPDATE exam_attempts
SET
  session_id = COALESCE(session_id, gen_random_uuid()),
  is_active = COALESCE(is_active, true),
  last_active_at = COALESCE(last_active_at, now()),
  violation_count = COALESCE(violation_count, 0),
  tab_switch_count = COALESCE(tab_switch_count, 0),
  warnings = COALESCE(warnings, '[]'::jsonb);

ALTER TABLE exam_attempts
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN last_active_at SET DEFAULT now(),
  ALTER COLUMN violation_count SET DEFAULT 0,
  ALTER COLUMN tab_switch_count SET DEFAULT 0,
  ALTER COLUMN warnings SET DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_attempts_session_id_key'
  ) THEN
    NULL; -- intentionally skip adding any unique constraint on session_id.
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_session_id ON exam_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_last_active_at ON exam_attempts(last_active_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_violation_count ON exam_attempts(violation_count);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_tab_switch_count ON exam_attempts(tab_switch_count);
