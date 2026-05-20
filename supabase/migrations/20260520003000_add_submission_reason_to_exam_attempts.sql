-- Add submission_reason column to exam_attempts for audit purposes

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS submission_reason text;

-- Backfill existing attempts if needed (no-op by default)
-- UPDATE exam_attempts SET submission_reason = NULL WHERE submission_reason IS NULL;
