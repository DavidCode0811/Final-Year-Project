import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        *,
        lecturer:users!exams_lecturer_id_fkey(name, email)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .eq('is_published', true)
      .maybeSingle();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, options, order_index')
      .eq('exam_id', id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        exam: {
          ...exam,
          questions: questions || []
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
