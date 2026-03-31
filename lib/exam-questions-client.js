import {
  normalizeQuestionPayload,
  validateQuestionInput,
} from '@/lib/exam-questions';
import { supabase } from '@/lib/supabase';

function getFirstValidationError(validation) {
  return Object.values(validation.errors)[0] || 'Please review the question form and try again.';
}

function assertLecturer(user) {
  if (!user) {
    throw new Error('You need to be signed in to manage questions.');
  }

  if (user.role !== 'lecturer') {
    throw new Error('Only lecturers can manage questions.');
  }

  return user;
}

async function assertLecturerOwnsExam(examId, user) {
  const lecturer = assertLecturer(user);

  const { data: exam, error } = await supabase
    .from('exams')
    .select('id, title, description, duration, start_time, end_time, is_published, created_at')
    .eq('id', examId)
    .eq('lecturer_id', lecturer.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch exam details.');
  }

  if (!exam) {
    throw new Error('Exam not found.');
  }

  return exam;
}

export async function fetchExamQuestionsForLecturer(examId, user) {
  const exam = await assertLecturerOwnsExam(examId, user);

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, exam_id, question_text, options, correct_answer, marks, order_index, created_at')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch questions.');
  }

  return {
    exam,
    questions: questions || [],
  };
}

export async function createQuestionForLecturer(examId, user, values) {
  await assertLecturerOwnsExam(examId, user);

  const validation = validateQuestionInput(values);

  if (!validation.isValid) {
    throw new Error(getFirstValidationError(validation));
  }

  const payload = normalizeQuestionPayload(values, examId);

  const { data, error } = await supabase
    .from('questions')
    .insert(payload)
    .select('id, exam_id, question_text, options, correct_answer, marks, order_index, created_at')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create question.');
  }

  return data;
}

export async function updateQuestionForLecturer(examId, questionId, user, values) {
  await assertLecturerOwnsExam(examId, user);

  const validation = validateQuestionInput(values);

  if (!validation.isValid) {
    throw new Error(getFirstValidationError(validation));
  }

  const payload = normalizeQuestionPayload(values, examId);
  delete payload.exam_id;

  const { data, error } = await supabase
    .from('questions')
    .update(payload)
    .eq('id', questionId)
    .eq('exam_id', examId)
    .select('id, exam_id, question_text, options, correct_answer, marks, order_index, created_at')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update question.');
  }

  if (!data) {
    throw new Error('Question not found.');
  }

  return data;
}

export async function deleteQuestionForLecturer(examId, questionId, user) {
  await assertLecturerOwnsExam(examId, user);

  const { data, error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
    .eq('exam_id', examId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to delete question.');
  }

  if (!data) {
    throw new Error('Question not found.');
  }

  return true;
}
