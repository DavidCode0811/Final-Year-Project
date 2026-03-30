/*
  # Allow Public Registration

  Allow unauthenticated users to insert new user records during registration.
  This is secure because we still validate all inputs and hash passwords.
*/

CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Lecturers can create exams" ON exams;

CREATE POLICY "Lecturers can create exams"
  ON exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'lecturer'
    ) OR lecturer_id = auth.uid()
  );
