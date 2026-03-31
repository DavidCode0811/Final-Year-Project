/*
  # Add Marks To Questions

  Extend question records so lecturers can assign marks per question and
  preserve explicit ordering within an exam.
*/

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS marks integer;

UPDATE questions
SET marks = 1
WHERE marks IS NULL;

ALTER TABLE questions
  ALTER COLUMN marks SET DEFAULT 1,
  ALTER COLUMN marks SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_marks_positive'
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT questions_marks_positive
      CHECK (marks > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_exam_id_order_index
  ON questions(exam_id, order_index);
