import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  try {
    const { data: exams, error } = await supabase
      .from('exams')
      .select(`
        *,
        lecturer:users!exams_lecturer_id_fkey(name, email),
        questions(id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase exams select error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: 'Failed to fetch exams' },
        { status: 500 }
      );
    }

    const examsWithQuestionCount = exams.map(exam => ({
      ...exam,
      question_count: exam.questions?.length || 0,
      questions: undefined
    }));

    return NextResponse.json({ exams: examsWithQuestionCount }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: add SUPABASE_SERVICE_ROLE_KEY to your environment.',
        },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    // Token contains { userId, role, timestamp } from `/api/auth/login`.
    console.log('Auth decoded for exam create:', {
      userId: decoded?.userId,
      role: decoded?.role,
    });

    if (decoded.role !== 'lecturer') {
      return NextResponse.json(
        { error: 'Only lecturers can create exams' },
        { status: 403 }
      );
    }

    const { title, duration, questions } = await request.json();

    if (!title || !duration || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Title, duration, and questions are required' },
        { status: 400 }
      );
    }

    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .insert([
        {
          title,
          duration,
          lecturer_id: decoded.userId,
          is_active: true
        }
      ])
      .select()
      .single();

    if (examError) {
      console.error('Supabase exams insert error:', {
        message: examError.message,
        code: examError.code,
        details: examError.details,
        hint: examError.hint,
      });
      return NextResponse.json(
        { error: 'Failed to create exam' },
        { status: 500 }
      );
    }

    const questionsToInsert = questions.map((q, index) => ({
      exam_id: exam.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      order_index: index
    }));

    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Supabase questions insert error:', {
        message: questionsError.message,
        code: questionsError.code,
        details: questionsError.details,
        hint: questionsError.hint,
      });
      await supabaseAdmin.from('exams').delete().eq('id', exam.id);
      return NextResponse.json(
        { error: 'Failed to create questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Exam created successfully', exam },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
