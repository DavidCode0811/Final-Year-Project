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
    const { db, profile } = await getAuthenticatedAppUser(request);
    const { id: examId } = await params;

    if (!['lecturer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only lecturers or admins can view exam results.' }, { status: 403 });
    }

    let examQuery = db
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
      .eq('id', examId);

    if (profile.role !== 'admin') {
      examQuery = examQuery.eq('lecturer_id', profile.id);
    }

    const { data: exam, error: examError } = await examQuery.maybeSingle();

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

    const { data: activityLogs, error: logsError } = await db
      .from('activity_logs')
      .select('id, user_id, event_type, timestamp, metadata')
      .eq('exam_id', examId)
      .order('timestamp', { ascending: false });

    if (logsError) {
      throw new Error(logsError.message || 'Failed to load activity logs.');
    }

    const questions = [...(exam.questions || [])].sort(
      (left, right) => Number(left.order_index ?? 0) - Number(right.order_index ?? 0)
    );
    const totalPossibleScore = questions.reduce(
      (total, question) => total + Number(question.marks || 0),
      0
    );

    const logsByStudentId = new Map();

    for (const log of activityLogs || []) {
      const key = String(log.user_id);
      const existing = logsByStudentId.get(key) || [];
      existing.push({
        id: log.id,
        eventType: log.event_type,
        timestamp: log.timestamp,
        metadata: log.metadata || {},
      });
      logsByStudentId.set(key, existing);
    }

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
      const correctCount = questionResults.filter((question) => question.isCorrect).length;
      const wrongCount = Math.max(0, questionResults.length - correctCount);
      const activityLogRows = logsByStudentId.get(String(attempt.student_id)) || [];
      const tabSwitchCount = activityLogRows.filter((log) => log.eventType === 'tab_switch').length;
      const suspiciousActivityCount = activityLogRows.filter((log) =>
        ['tab_switch', 'inactive', 'multi_tab'].includes(log.eventType)
      ).length;

      return {
        id: attempt.id,
        studentId: attempt.student_id,
        studentName: attempt.student?.name || 'Unknown Student',
        studentEmail: attempt.student?.email || '',
        examTitle: exam.title,
        score: Number(attempt.score || 0),
        percentage:
          totalPossibleScore > 0
            ? Math.round((Number(attempt.score || 0) / totalPossibleScore) * 1000) / 10
            : 0,
        correctCount,
        wrongCount,
        status: attempt.status,
        submissionType: attempt.status === 'auto_submitted' ? 'auto' : 'manual',
        startedAt: attempt.started_at,
        endTime: attempt.end_time || attempt.submitted_at,
        submittedAt: attempt.submitted_at || attempt.end_time,
        timeTakenSeconds: getAttemptTimeTakenSeconds(attempt),
        tabSwitchCount,
        suspiciousActivityCount,
        activityLogs: activityLogRows,
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
