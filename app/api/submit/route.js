import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function buildScorePayload(scoredAnswers, examId, attemptId) {
  const relevantAnswers = (scoredAnswers || []).filter((answer) => {
    return String(answer?.question?.exam_id || '') === String(examId);
  });

  const answerUpdates = relevantAnswers.map((answer) => {
    const isCorrect = answer.selected_answer === answer.question?.correct_answer;

    return {
      id: answer.id,
      attempt_id: attemptId,
      question_id: answer.question_id,
      selected_answer: answer.selected_answer,
      is_correct: isCorrect,
    };
  });

  const score = relevantAnswers.reduce((total, answer) => {
    const isCorrect = answer.selected_answer === answer.question?.correct_answer;
    return isCorrect ? total + Number(answer.question?.marks || 0) : total;
  }, 0);

  const correctCount = answerUpdates.filter((answer) => answer.is_correct).length;

  return {
    answerUpdates,
    score,
    correctCount,
  };
}

export async function POST(request) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'student',
    });

    const { exam_id, attempt_id, answers, submission_type = 'manual', submission_reason = null } = await request.json();

    if (!isUuid(exam_id) || !answers) {
      return NextResponse.json(
        { error: 'A valid exam ID and answers are required' },
        { status: 400 }
      );
    }

    if (attempt_id && !isUuid(attempt_id)) {
      return NextResponse.json(
        { error: 'A valid attempt ID is required' },
        { status: 400 }
      );
    }

    let attemptLookup = db
      .from('exam_attempts')
      .select('id, status')
      .eq('exam_id', exam_id)
      .eq('student_id', profile.id);

    if (attempt_id) {
      attemptLookup = attemptLookup.eq('id', attempt_id);
    }

    const { data: existingAttempt, error: attemptError } = await attemptLookup.maybeSingle();

    if (attemptError) {
      console.error('Submit exam attempt fetch:', attemptError);
      return NextResponse.json(
        { error: 'Failed to load your exam attempt' },
        { status: 500 }
      );
    }

    if (['submitted', 'auto_submitted'].includes(existingAttempt?.status)) {
      return NextResponse.json(
        { error: 'Exam already submitted' },
        { status: 400 }
      );
    }

    const { data: questions, error: questionsError } = await db
      .from('questions')
      .select('id, marks')
      .eq('exam_id', exam_id);

    if (questionsError) {
      console.error('Submit exam questions fetch:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    const validQuestionIds = new Set((questions || []).map((question) => String(question.id)));
    const totalMarks = (questions || []).reduce(
      (total, question) => total + Number(question.marks || 0),
      0
    );

    let targetAttemptId = existingAttempt?.id;

    if (!targetAttemptId) {
      const { data: createdAttempt, error: createAttemptError } = await db
        .from('exam_attempts')
        .insert({
          exam_id,
          student_id: profile.id,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (createAttemptError) {
        console.error('Submit exam attempt create:', createAttemptError);
        return NextResponse.json(
          { error: 'Failed to create your exam attempt' },
          { status: 500 }
        );
      }

      targetAttemptId = createdAttempt.id;
    }

    const answerRows = Object.entries(answers)
      .filter(([questionId, selectedAnswer]) => {
        return Boolean(selectedAnswer) && validQuestionIds.has(String(questionId));
      })
      .map(([questionId, selectedAnswer]) => ({
        attempt_id: targetAttemptId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        saved_at: new Date().toISOString(),
      }));

    if (answerRows.length > 0) {
      const { error: answerUpsertError } = await db
        .from('answers')
        .upsert(answerRows, {
          onConflict: 'attempt_id,question_id',
        });

      if (answerUpsertError) {
        console.error('Submit exam answer sync:', answerUpsertError);
        return NextResponse.json(
          { error: 'Failed to save your final answers' },
          { status: 500 }
        );
      }
    }

    const { data: scoredAnswers, error: scoredAnswersError } = await db
      .from('answers')
      .select(`
        id,
        attempt_id,
        question_id,
        selected_answer,
        question:questions!answers_question_id_fkey (
          id,
          exam_id,
          correct_answer,
          marks
        )
      `)
      .eq('attempt_id', targetAttemptId);

    if (scoredAnswersError) {
      console.error('Submit exam scoring fetch:', scoredAnswersError);
      return NextResponse.json(
        { error: 'Failed to score your exam' },
        { status: 500 }
      );
    }

    const { answerUpdates, score, correctCount } = buildScorePayload(
      scoredAnswers,
      exam_id,
      targetAttemptId
    );

    if (answerUpdates.length > 0) {
      const { error: answerScoreError } = await db
        .from('answers')
        .upsert(answerUpdates, {
          onConflict: 'id',
        });

      if (answerScoreError) {
        console.error('Submit exam answer scoring update:', answerScoreError);
        return NextResponse.json(
          { error: 'Failed to persist scored answers' },
          { status: 500 }
        );
      }
    }

    const nextStatus = submission_type === 'auto' ? 'auto_submitted' : 'submitted';
    const submittedAt = new Date().toISOString();

    const updatePayload = {
      status: nextStatus,
      submitted_at: submittedAt,
      end_time: submittedAt,
      last_saved_at: submittedAt,
      score,
      is_active: false,
    };

    if (submission_reason) {
      updatePayload.submission_reason = submission_reason;
    }

    const { data: attempt, error: updateAttemptError } = await db
      .from('exam_attempts')
      .update(updatePayload)
      .eq('id', targetAttemptId)
      .eq('student_id', profile.id)
      .eq('exam_id', exam_id)
      .select()
      .single();

    if (updateAttemptError) {
      console.error('Submit exam attempt update:', updateAttemptError);
      return NextResponse.json(
        { error: 'Failed to submit exam' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Exam submitted successfully',
        score,
        correctCount,
        totalQuestions: questions.length,
        totalMarks,
        attempt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}
