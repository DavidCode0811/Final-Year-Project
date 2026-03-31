import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

function getAttemptTimeTakenSeconds(attempt) {
  const startedAt = attempt?.started_at ? new Date(attempt.started_at).getTime() : null;
  const endedAtRaw = attempt?.end_time || attempt?.submitted_at || null;
  const endedAt = endedAtRaw ? new Date(endedAtRaw).getTime() : null;

  if (!startedAt || !endedAt || Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
    return null;
  }

  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

export async function GET(request, { params }) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'lecturer',
    });
    const { id: examId } = await params;

    const { data: exam, error: examError } = await db
      .from('exams')
      .select(
        `
          id,
          title,
          lecturer_id,
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
      .eq('lecturer_id', profile.id)
      .maybeSingle();

    if (examError) {
      throw new Error(examError.message || 'Failed to load exam details.');
    }

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }

    const { data: attempts, error: attemptsError } = await db
      .from('exam_attempts')
      .select(
        `
          id,
          exam_id,
          student_id,
          status,
          score,
          started_at,
          end_time,
          submitted_at,
          created_at,
          student:users!exam_attempts_student_id_fkey (
            id,
            name,
            email
          ),
          answers (
            id,
            question_id,
            selected_answer,
            is_correct,
            question:questions!answers_question_id_fkey (
              id,
              exam_id,
              question_text,
              correct_answer,
              marks,
              order_index
            )
          )
        `
      )
      .eq('exam_id', examId)
      .in('status', ['submitted', 'auto_submitted'])
      .order('score', { ascending: false })
      .order('submitted_at', { ascending: false });

    if (attemptsError) {
      throw new Error(attemptsError.message || 'Failed to load exam attempts.');
    }

    const questions = [...(exam.questions || [])].sort(
      (left, right) => Number(left.order_index ?? 0) - Number(right.order_index ?? 0)
    );
    const totalPossibleScore = questions.reduce(
      (total, question) => total + Number(question.marks || 0),
      0
    );

    const rows = (attempts || []).map((attempt) => {
      const answersByQuestionId = new Map(
        (attempt.answers || []).map((answer) => [String(answer.question_id), answer])
      );

      const questionResults = questions.map((question, index) => {
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
        id: attempt.id,
        studentId: attempt.student_id,
        studentName: attempt.student?.name || 'Unknown Student',
        studentEmail: attempt.student?.email || '',
        score: Number(attempt.score || 0),
        status: attempt.status,
        submissionType: attempt.status === 'auto_submitted' ? 'auto' : 'manual',
        startedAt: attempt.started_at,
        endTime: attempt.end_time || attempt.submitted_at,
        submittedAt: attempt.submitted_at || attempt.end_time,
        timeTakenSeconds: getAttemptTimeTakenSeconds(attempt),
        questionResults,
      };
    });

    return NextResponse.json(
      {
        exam: {
          id: exam.id,
          title: exam.title,
          totalQuestions: questions.length,
          totalPossibleScore,
        },
        rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching lecturer exam results:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}

