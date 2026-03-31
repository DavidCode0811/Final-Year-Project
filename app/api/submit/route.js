import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

export async function POST(request) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'student',
    });

    const { exam_id, answers, submission_type = 'manual' } = await request.json();

    if (!exam_id || !answers) {
      return NextResponse.json(
        { error: 'Exam ID and answers are required' },
        { status: 400 }
      );
    }

    const { data: existingResponse } = await db
      .from('responses')
      .select('id')
      .eq('user_id', profile.id)
      .eq('exam_id', exam_id)
      .maybeSingle();

    if (existingResponse) {
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

    const { data: response, error: responseError } = await db
      .from('responses')
      .insert([
        {
          user_id: profile.id,
          exam_id,
          answers,
          score,
          submission_type,
        },
      ])
      .select()
      .single();

    if (responseError) {
      console.error('Submit exam insert:', responseError);
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
        response,
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
