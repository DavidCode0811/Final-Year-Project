import { supabase } from '@/lib/supabase';

export const defaultExamFormValues = {
  title: '',
  description: '',
  duration: '60',
  startTime: '',
  endTime: '',
  isPublished: false,
};

export function validateExamInput(values) {
  const errors = {};
  const duration = Number(values.duration);

  if (!values.title?.trim()) {
    errors.title = 'Title is required.';
  }

  if (!values.description?.trim()) {
    errors.description = 'Description is required.';
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    errors.duration = 'Duration must be greater than 0.';
  }

  if (!values.startTime) {
    errors.startTime = 'Start time is required.';
  }

  if (!values.endTime) {
    errors.endTime = 'End time is required.';
  }

  const startDate = values.startTime ? new Date(values.startTime) : null;
  const endDate = values.endTime ? new Date(values.endTime) : null;

  if (values.startTime && Number.isNaN(startDate?.getTime())) {
    errors.startTime = 'Enter a valid start time.';
  }

  if (values.endTime && Number.isNaN(endDate?.getTime())) {
    errors.endTime = 'Enter a valid end time.';
  }

  if (
    startDate &&
    endDate &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    endDate <= startDate
  ) {
    errors.endTime = 'End time must be after start time.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeExamPayload(values, lecturerId) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    duration: Number(values.duration),
    start_time: new Date(values.startTime).toISOString(),
    end_time: new Date(values.endTime).toISOString(),
    is_published: Boolean(values.isPublished),
    is_active: true,
    lecturer_id: lecturerId,
  };
}

function unwrapSupabaseError(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  return error.message || error.details || fallbackMessage;
}

export async function fetchLecturerExams(lecturerId) {
  const { data, error } = await supabase
    .from('exams')
    .select(
      'id, title, description, duration, start_time, end_time, is_published, created_at'
    )
    .eq('lecturer_id', lecturerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(unwrapSupabaseError(error, 'Failed to load your exams.'));
  }

  return data || [];
}

export async function fetchLecturerExamById(examId, lecturerId) {
  const { data, error } = await supabase
    .from('exams')
    .select(
      'id, title, description, duration, start_time, end_time, is_published, created_at'
    )
    .eq('id', examId)
    .eq('lecturer_id', lecturerId)
    .maybeSingle();

  if (error) {
    throw new Error(unwrapSupabaseError(error, 'Failed to load the exam.'));
  }

  if (!data) {
    throw new Error('Exam not found.');
  }

  return data;
}

export async function createLecturerExam(values, lecturerId) {
  const validation = validateExamInput(values);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Please review the form and try again.');
  }

  const payload = normalizeExamPayload(values, lecturerId);

  const { data, error } = await supabase
    .from('exams')
    .insert(payload)
    .select(
      'id, title, description, duration, start_time, end_time, is_published, created_at'
    )
    .single();

  if (error) {
    throw new Error(unwrapSupabaseError(error, 'Failed to create the exam.'));
  }

  return data;
}

export async function updateLecturerExamPublishStatus(examId, lecturerId, isPublished) {
  if (isPublished) {
    const { count, error: countError } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId);

    if (countError) {
      throw new Error(unwrapSupabaseError(countError, 'Failed to validate exam questions.'));
    }

    if (!count || count < 1) {
      throw new Error('Add at least one question before publishing this exam.');
    }
  }

  const { data, error } = await supabase
    .from('exams')
    .update({ is_published: Boolean(isPublished) })
    .eq('id', examId)
    .eq('lecturer_id', lecturerId)
    .select(
      'id, title, description, duration, start_time, end_time, is_published, created_at'
    )
    .maybeSingle();

  if (error) {
    throw new Error(unwrapSupabaseError(error, 'Failed to update exam publishing status.'));
  }

  if (!data) {
    throw new Error('Exam not found.');
  }

  return data;
}
