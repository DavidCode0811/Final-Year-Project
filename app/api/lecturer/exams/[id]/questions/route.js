import { NextResponse } from 'next/server';

import { normalizeQuestionPayload, validateQuestionInput } from '@/lib/exam-questions';
import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

function buildErrorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function getFirstValidationError(validation) {
  return Object.values(validation.errors)[0] || 'Please review the question form and try again.';
}

async function getLecturerExamContext(request, examId) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'lecturer',
    });

    const { data: exam, error: examError } = await db
      .from('exams')
      .select('id, title, description, duration, start_time, end_time, is_published, created_at')
      .eq('id', examId)
      .eq('lecturer_id', profile.id)
      .maybeSingle();

    if (examError) {
      return { error: buildErrorResponse('Failed to fetch exam details.', 500) };
    }

    if (!exam) {
      return { error: buildErrorResponse('Exam not found.', 404) };
    }

    return {
      db,
      exam,
    };
  } catch (error) {
    return {
      error: buildErrorResponse(
        error.message || 'Unable to load the lecturer exam context.',
        getHttpStatus(error)
      ),
    };
  }
}

export async function GET(request, { params }) {
  const { id: examId } = await params;
  const context = await getLecturerExamContext(request, examId);

  if (context.error) {
    return context.error;
  }

  const { db, exam } = context;
  const { data: questions, error } = await db
    .from('questions')
    .select('id, exam_id, question_text, options, correct_answer, marks, order_index, created_at')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return buildErrorResponse('Failed to fetch questions.', 500);
  }

  return NextResponse.json(
    {
      exam,
      questions: questions || [],
    },
    { status: 200 }
  );
}

export async function POST(request, { params }) {
  const { id: examId } = await params;
  const context = await getLecturerExamContext(request, examId);

  if (context.error) {
    return context.error;
  }

  const { db } = context;
  const body = await request.json();
  const validation = validateQuestionInput(body);

  if (!validation.isValid) {
    return buildErrorResponse(getFirstValidationError(validation), 400);
  }

  const payload = normalizeQuestionPayload(body, examId);
  const { data: question, error } = await db
    .from('questions')
    .insert(payload)
    .select('id, exam_id, question_text, options, correct_answer, marks, order_index, created_at')
    .single();

  if (error) {
    return buildErrorResponse('Failed to create question.', 500);
  }

  return NextResponse.json(
    {
      message: 'Question created successfully.',
      question,
    },
    { status: 201 }
  );
}
