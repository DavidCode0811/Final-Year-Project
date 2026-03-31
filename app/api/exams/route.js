import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

export async function GET() {
  try {
    const { data: exams, error } = await supabase
      .from('exams')
      .select(`
        *,
        lecturer:users!exams_lecturer_id_fkey(name, email),
        questions(id)
      `)
      .eq('is_active', true)
      .eq('is_published', true)
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

    const examsWithQuestionCount = exams.map((exam) => ({
      ...exam,
      question_count: exam.questions?.length || 0,
      questions: undefined,
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
    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'lecturer',
    });

    const { title, duration, questions } = await request.json();

    if (!title || !duration || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Title, duration, and questions are required' },
        { status: 400 }
      );
    }

    const { data: exam, error: examError } = await db
      .from('exams')
      .insert([
        {
          title,
          duration,
          lecturer_id: profile.id,
          is_active: true,
        },
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

    const questionsToInsert = questions.map((question, index) => ({
      exam_id: exam.id,
      question_text: question.question_text,
      options: question.options,
      correct_answer: question.correct_answer,
      order_index: index,
    }));

    const { error: questionsError } = await db
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Supabase questions insert error:', {
        message: questionsError.message,
        code: questionsError.code,
        details: questionsError.details,
        hint: questionsError.hint,
      });
      await db.from('exams').delete().eq('id', exam.id);
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
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}
