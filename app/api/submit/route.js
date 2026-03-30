import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: add SUPABASE_SERVICE_ROLE_KEY to your environment (Supabase Dashboard → Settings → API → service_role).',
        },
        { status: 503 }
      );
    }

    const db = supabaseAdmin;

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

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
      .eq('user_id', decoded.userId)
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
    questions.forEach(question => {
      const qid = String(question.id);
      if (answers[qid] === question.correct_answer) {
        score++;
      }
    });

    const { data: response, error: responseError } = await db
      .from('responses')
      .insert([
        {
          user_id: decoded.userId,
          exam_id,
          answers,
          score,
          submission_type
        }
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
        response
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
