/*
  # Create Exam Attempt Tracking

  Add normalized attempt and answer tables so student exam progress can be
  resumed safely and autosaved one answer at a time.

  This migration is written to be resilient if a partial/older version of the
  tables already exists. In particular, it will:
  - create the tables when missing
  - add missing columns when the table already exists
  - backfill `user_id -> student_id` if an older draft used `user_id`
*/

CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS exam_id uuid,
  ADD COLUMN IF NOT EXISTS student_id uuid,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_attempts'
      AND column_name = 'user_id'
  ) THEN
    UPDATE exam_attempts
    SET student_id = user_id
    WHERE student_id IS NULL;
  END IF;
END $$;

UPDATE exam_attempts
SET
  status = COALESCE(status, 'in_progress'),
  started_at = COALESCE(started_at, now()),
  last_saved_at = COALESCE(last_saved_at, now()),
  created_at = COALESCE(created_at, started_at, now());

ALTER TABLE exam_attempts
  ALTER COLUMN status SET DEFAULT 'in_progress',
  ALTER COLUMN started_at SET DEFAULT now(),
  ALTER COLUMN last_saved_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_attempts_exam_id_fkey'
  ) THEN
    ALTER TABLE exam_attempts
      ADD CONSTRAINT exam_attempts_exam_id_fkey
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_attempts_student_id_fkey'
  ) THEN
    ALTER TABLE exam_attempts
      ADD CONSTRAINT exam_attempts_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_attempts_status_check'
  ) THEN
    ALTER TABLE exam_attempts
      ADD CONSTRAINT exam_attempts_status_check
      CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'abandoned'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_attempts_exam_id_student_id_key'
  ) THEN
    ALTER TABLE exam_attempts
      ADD CONSTRAINT exam_attempts_exam_id_student_id_key
      UNIQUE (exam_id, student_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM exam_attempts
    WHERE exam_id IS NULL
       OR student_id IS NULL
       OR status IS NULL
       OR started_at IS NULL
       OR last_saved_at IS NULL
       OR created_at IS NULL
  ) THEN
    ALTER TABLE exam_attempts
      ALTER COLUMN exam_id SET NOT NULL,
      ALTER COLUMN student_id SET NOT NULL,
      ALTER COLUMN status SET NOT NULL,
      ALTER COLUMN started_at SET NOT NULL,
      ALTER COLUMN last_saved_at SET NOT NULL,
      ALTER COLUMN created_at SET NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS attempt_id uuid,
  ADD COLUMN IF NOT EXISTS question_id uuid,
  ADD COLUMN IF NOT EXISTS selected_answer text,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'answers'
      AND column_name = 'answer'
  ) THEN
    UPDATE answers
    SET selected_answer = answer
    WHERE selected_answer IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'answers'
      AND column_name = 'selected_option'
  ) THEN
    UPDATE answers
    SET selected_answer = selected_option
    WHERE selected_answer IS NULL;
  END IF;
END $$;

UPDATE answers
SET
  saved_at = COALESCE(saved_at, now()),
  created_at = COALESCE(created_at, saved_at, now());

ALTER TABLE answers
  ALTER COLUMN saved_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'answers_attempt_id_fkey'
  ) THEN
    ALTER TABLE answers
      ADD CONSTRAINT answers_attempt_id_fkey
      FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'answers_question_id_fkey'
  ) THEN
    ALTER TABLE answers
      ADD CONSTRAINT answers_question_id_fkey
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'answers_attempt_id_question_id_key'
  ) THEN
    ALTER TABLE answers
      ADD CONSTRAINT answers_attempt_id_question_id_key
      UNIQUE (attempt_id, question_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM answers
    WHERE attempt_id IS NULL
       OR question_id IS NULL
       OR selected_answer IS NULL
       OR saved_at IS NULL
       OR created_at IS NULL
  ) THEN
    ALTER TABLE answers
      ALTER COLUMN attempt_id SET NOT NULL,
      ALTER COLUMN question_id SET NOT NULL,
      ALTER COLUMN selected_answer SET NOT NULL,
      ALTER COLUMN saved_at SET NOT NULL,
      ALTER COLUMN created_at SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

GRANT ALL PRIVILEGES ON TABLE exam_attempts TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE answers TO anon, authenticated, service_role;
