import { supabase } from '@/lib/supabase';

export function getExamStorageKey(examId) {
  return `student-exam:${examId}:answers`;
}

export function getExamQuestionIndexKey(examId) {
  return `student-exam:${examId}:current-question`;
}

export function getStoredExamAnswers(examId) {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(getExamStorageKey(examId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

export function storeExamAnswers(examId, answers) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getExamStorageKey(examId), JSON.stringify(answers));
}

export function clearStoredExamAnswers(examId) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getExamStorageKey(examId));
}

export function getStoredQuestionIndex(examId) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const raw = window.localStorage.getItem(getExamQuestionIndexKey(examId));
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function storeQuestionIndex(examId, index) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getExamQuestionIndexKey(examId), String(index));
}

export function clearStoredQuestionIndex(examId) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getExamQuestionIndexKey(examId));
}

export function getExamAvailability(exam) {
  if (!exam?.is_published) {
    return {
      available: false,
      reason: 'This exam has not been published yet.',
    };
  }

  const now = new Date();
  const startTime = exam.start_time ? new Date(exam.start_time) : null;
  const endTime = exam.end_time ? new Date(exam.end_time) : null;

  if (startTime && now < startTime) {
    return {
      available: false,
      reason: `This exam opens on ${startTime.toLocaleString()}.`,
    };
  }

  if (endTime && now > endTime) {
    return {
      available: false,
      reason: `This exam closed on ${endTime.toLocaleString()}.`,
    };
  }

  return {
    available: true,
    reason: '',
  };
}

export function countAnsweredQuestions(answers) {
  return Object.values(answers || {}).filter(Boolean).length;
}

export function getAttemptRemainingSeconds(durationMinutes, startedAt) {
  const durationSeconds = Math.max(0, Number(durationMinutes || 0) * 60);

  if (!startedAt) {
    return durationSeconds;
  }

  const startedAtMs = new Date(startedAt).getTime();

  if (Number.isNaN(startedAtMs)) {
    return durationSeconds;
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  return Math.max(0, durationSeconds - elapsedSeconds);
}

export function isAttemptSubmitted(attempt) {
  return ['submitted', 'auto_submitted'].includes(attempt?.status);
}

export function getAttemptSubmissionType(attempt) {
  return attempt?.status === 'auto_submitted' ? 'auto' : 'manual';
}

export function getAttemptTimeTakenSeconds(attempt) {
  const startedAt = attempt?.started_at ? new Date(attempt.started_at).getTime() : null;
  const endedAtRaw = attempt?.end_time || attempt?.submitted_at || null;
  const endedAt = endedAtRaw ? new Date(endedAtRaw).getTime() : null;

  if (!startedAt || !endedAt || Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
    return null;
  }

  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

export async function fetchStudentExam(examId) {
  const { data, error } = await supabase
    .from('exams')
    .select(
      `
        id,
        title,
        description,
        duration,
        start_time,
        end_time,
        is_published,
        questions (
          id,
          question_text,
          options,
          order_index
        )
      `
    )
    .eq('id', examId)
    .eq('is_active', true)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch exam details.');
  }

  if (!data) {
    throw new Error('Exam not found.');
  }

  return {
    ...data,
    questions: [...(data.questions || [])].sort(
      (left, right) => Number(left.order_index ?? 0) - Number(right.order_index ?? 0)
    ),
  };
}

export async function fetchSubmittedStudentAttempt(examId, studentId) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, student_id, status, score, end_time, submitted_at, started_at, last_saved_at')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted'])
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to check previous submissions.');
  }

  return data;
}

export async function fetchStudentAttempt(examId, studentId) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load your exam attempt.');
  }

  return data;
}

export async function createOrResumeAttempt(examId, studentId) {
  const existingAttempt = await fetchStudentAttempt(examId, studentId);

  if (existingAttempt) {
    return existingAttempt;
  }

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .insert({
      exam_id: examId,
      student_id: studentId,
      status: 'in_progress',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create your exam attempt.');
  }

  return attempt;
}

export async function fetchAttemptAnswers(attemptId) {
  const { data, error } = await supabase
    .from('answers')
    .select('question_id, selected_answer')
    .eq('attempt_id', attemptId);

  if (error) {
    throw new Error(error.message || 'Failed to load saved answers.');
  }

  return (data || []).reduce((accumulator, row) => {
    accumulator[row.question_id] = row.selected_answer;
    return accumulator;
  }, {});
}

export async function fetchStudentResult(examId, studentId) {
  const attempt = await fetchSubmittedStudentAttempt(examId, studentId);

  if (!attempt) {
    return null;
  }

  const [{ data: exam, error: examError }, scoredAnswers] = await Promise.all([
    supabase
      .from('exams')
      .select(
        `
          id,
          title,
          questions (
            id,
            question_text,
            correct_answer,
            marks,
            order_index
          )
        `
      )
      .eq('id', examId)
      .maybeSingle(),
    supabase
      .from('answers')
      .select(`
        id,
        question_id,
        selected_answer,
        is_correct,
        question:questions!answers_question_id_fkey (
          id,
          exam_id,
          question_text,
          correct_answer,
          order_index,
          marks
        )
      `)
      .eq('attempt_id', attempt.id),
  ]);

  if (examError) {
    throw new Error(examError.message || 'Failed to load the result summary.');
  }

  if (scoredAnswers?.error) {
    throw new Error(scoredAnswers.error.message || 'Failed to load scored answers.');
  }

  if (!exam) {
    throw new Error('Exam not found.');
  }

  const questions = exam.questions || [];
  const sortedQuestions = [...questions].sort(
    (left, right) => Number(left.order_index ?? 0) - Number(right.order_index ?? 0)
  );
  const totalMarks = questions.reduce(
    (total, question) => total + Number(question.marks || 0),
    0
  );
  const answerRows = (scoredAnswers.data || []).filter((answer) => {
    return String(answer?.question?.exam_id || '') === String(examId);
  });
  const correctCount = answerRows.filter((answer) => answer.is_correct).length;
  const score =
    attempt.score != null
      ? Number(attempt.score)
      : answerRows.reduce((total, answer) => {
          return answer.is_correct ? total + Number(answer.question?.marks || 0) : total;
        }, 0);
  const answersByQuestionId = new Map(
    answerRows.map((answer) => [String(answer.question_id), answer])
  );
  const questionResults = sortedQuestions.map((question, index) => {
    const answer = answersByQuestionId.get(String(question.id));
    const selectedAnswer = answer?.selected_answer || null;
    const isCorrect =
      typeof answer?.is_correct === 'boolean'
        ? answer.is_correct
        : Boolean(selectedAnswer && selectedAnswer === question.correct_answer);

    return {
      index: index + 1,
      questionId: question.id,
      questionText: question.question_text,
      selectedAnswer,
      correctAnswer: question.correct_answer,
      isCorrect,
      marks: Number(question.marks || 0),
      earnedMarks: isCorrect ? Number(question.marks || 0) : 0,
    };
  });

  return {
    attempt,
    exam,
    score,
    correctCount,
    totalQuestions: questions.length,
    totalMarks,
    submissionType: getAttemptSubmissionType(attempt),
    submissionStatus: attempt.status,
    timeTakenSeconds: getAttemptTimeTakenSeconds(attempt),
    questionResults,
  };
}

export async function saveAttemptAnswer(attemptId, questionId, selectedAnswer) {
  const { error } = await supabase
    .from('answers')
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        saved_at: new Date().toISOString(),
      },
      {
        onConflict: 'attempt_id,question_id',
      }
    );

  if (error) {
    throw new Error(error.message || 'Failed to save your answer.');
  }

  await supabase
    .from('exam_attempts')
    .update({ last_saved_at: new Date().toISOString() })
    .eq('id', attemptId);
}

export async function logExamActivity({ token, examId, eventType, metadata = {} }) {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      exam_id: examId,
      event_type: eventType,
      metadata,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to log exam activity.');
  }

  return data.log;
}

export async function submitStudentExam({
  examId,
  token,
  answers,
  attemptId,
  submissionType = 'manual',
}) {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      exam_id: examId,
      attempt_id: attemptId,
      answers,
      submission_type: submissionType,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit exam.');
  }

  return data;
}
