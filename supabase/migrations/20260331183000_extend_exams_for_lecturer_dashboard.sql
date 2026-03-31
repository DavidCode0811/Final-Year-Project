/*
  # Extend Exams For Lecturer Dashboard

  Add scheduling, publishing, and description fields so lecturers can manage
  exam metadata from the dashboard.
*/

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS is_published boolean;

UPDATE exams
SET is_published = COALESCE(is_active, true)
WHERE is_published IS NULL;

ALTER TABLE exams
  ALTER COLUMN is_published SET DEFAULT false,
  ALTER COLUMN is_published SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exams_valid_time_window'
  ) THEN
    ALTER TABLE exams
      ADD CONSTRAINT exams_valid_time_window
      CHECK (
        start_time IS NULL
        OR end_time IS NULL
        OR end_time > start_time
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exams_is_published ON exams(is_published);
CREATE INDEX IF NOT EXISTS idx_exams_start_time ON exams(start_time);
