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
      .select('id')
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

export async function PATCH(request, { params }) {
  const { id: examId, questionId } = await params;
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
  delete payload.exam_id;

  const { data: question, error } = await db
    .from('questions')
    .update(payload)
    .eq('id', questionId)
    .eq('exam_id', examId)
    .select('id, exam_id, question_text, options, correct_answer, marks, order_index, created_at')
    .maybeSingle();

  if (error) {
    return buildErrorResponse('Failed to update question.', 500);
  }

  if (!question) {
    return buildErrorResponse('Question not found.', 404);
  }

  return NextResponse.json(
    {
      message: 'Question updated successfully.',
      question,
    },
    { status: 200 }
  );
}

export async function DELETE(request, { params }) {
  const { id: examId, questionId } = await params;
  const context = await getLecturerExamContext(request, examId);

  if (context.error) {
    return context.error;
  }

  const { db } = context;
  const { data: question, error } = await db
    .from('questions')
    .delete()
    .eq('id', questionId)
    .eq('exam_id', examId)
    .select('id')
    .maybeSingle();

  if (error) {
    return buildErrorResponse('Failed to delete question.', 500);
  }

  if (!question) {
    return buildErrorResponse('Question not found.', 404);
  }

  return NextResponse.json(
    {
      message: 'Question deleted successfully.',
    },
    { status: 200 }
  );
}
