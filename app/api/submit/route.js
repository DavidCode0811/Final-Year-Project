import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

export async function POST(request) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'student',
    });

    const { exam_id, attempt_id, answers, submission_type = 'manual' } = await request.json();

    if (!exam_id || !answers) {
      return NextResponse.json(
        { error: 'Exam ID and answers are required' },
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
      .select('id, correct_answer')
      .eq('exam_id', exam_id);

    if (questionsError) {
      console.error('Submit exam questions fetch:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    let score = 0;
    questions.forEach((question) => {
      const questionId = String(question.id);

      if (answers[questionId] === question.correct_answer) {
        score += 1;
      }
    });

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
      .filter(([, selectedAnswer]) => Boolean(selectedAnswer))
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

    const nextStatus = submission_type === 'auto' ? 'auto_submitted' : 'submitted';

    const { data: attempt, error: updateAttemptError } = await db
      .from('exam_attempts')
      .update({
        status: nextStatus,
        submitted_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString(),
      })
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
        total: questions.length,
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
