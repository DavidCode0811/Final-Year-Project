/*
  # Add Exam Scoring Columns

  Extend normalized attempt tracking so final submission can persist:
  - `exam_attempts.end_time`
  - `exam_attempts.score`
  - `answers.is_correct`

  This keeps scoring server-side and allows result pages to read the stored
  outcome directly from Supabase.
*/

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS score integer;

UPDATE exam_attempts
SET
  end_time = COALESCE(end_time, submitted_at),
  score = COALESCE(score, 0);

ALTER TABLE exam_attempts
  ALTER COLUMN score SET DEFAULT 0,
  ALTER COLUMN score SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exam_attempts_score_non_negative'
  ) THEN
    ALTER TABLE exam_attempts
      ADD CONSTRAINT exam_attempts_score_non_negative
      CHECK (score >= 0);
  END IF;
END $$;

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS is_correct boolean;

CREATE INDEX IF NOT EXISTS idx_answers_attempt_id_is_correct
  ON answers(attempt_id, is_correct);
