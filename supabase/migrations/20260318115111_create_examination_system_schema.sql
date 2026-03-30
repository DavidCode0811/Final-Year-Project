/*
  # Online Examination System Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `password` (text, hashed)
      - `role` (text: 'student' or 'lecturer')
      - `created_at` (timestamptz)
    
    - `exams`
      - `id` (uuid, primary key)
      - `title` (text)
      - `duration` (integer, in minutes)
      - `lecturer_id` (uuid, foreign key to users)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
    
    - `questions`
      - `id` (uuid, primary key)
      - `exam_id` (uuid, foreign key to exams)
      - `question_text` (text)
      - `options` (jsonb array of options)
      - `correct_answer` (text)
      - `order_index` (integer)
      - `created_at` (timestamptz)
    
    - `responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `exam_id` (uuid, foreign key to exams)
      - `answers` (jsonb)
      - `score` (integer)
      - `submitted_at` (timestamptz)
      - `submission_type` (text: 'manual' or 'auto')
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `exam_id` (uuid, foreign key to exams)
      - `event_type` (text)
      - `timestamp` (timestamptz)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'lecturer')),
  created_at timestamptz DEFAULT now()
);

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  duration integer NOT NULL,
  lecturer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  score integer DEFAULT 0,
  submitted_at timestamptz DEFAULT now(),
  submission_type text NOT NULL CHECK (submission_type IN ('manual', 'auto')),
  UNIQUE(user_id, exam_id)
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for exams table
CREATE POLICY "Anyone can view active exams"
  ON exams FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Lecturers can create exams"
  ON exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'lecturer'
    )
  );

CREATE POLICY "Lecturers can update own exams"
  ON exams FOR UPDATE
  TO authenticated
  USING (lecturer_id = auth.uid())
  WITH CHECK (lecturer_id = auth.uid());

CREATE POLICY "Lecturers can delete own exams"
  ON exams FOR DELETE
  TO authenticated
  USING (lecturer_id = auth.uid());

-- RLS Policies for questions table
CREATE POLICY "Students can view questions for active exams"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.is_active = true
    )
  );

CREATE POLICY "Lecturers can manage questions for own exams"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.lecturer_id = auth.uid()
    )
  );

-- RLS Policies for responses table
CREATE POLICY "Students can view own responses"
  ON responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students can insert own responses"
  ON responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Lecturers can view responses for their exams"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = responses.exam_id
      AND exams.lecturer_id = auth.uid()
    )
  );

-- RLS Policies for activity_logs table
CREATE POLICY "Users can create own activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Lecturers can view activity logs for their exams"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = activity_logs.exam_id
      AND exams.lecturer_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_lecturer_id ON exams(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_exam_id ON responses(exam_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_exam_id ON activity_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
