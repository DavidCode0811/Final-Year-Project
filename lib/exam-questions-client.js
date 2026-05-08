import {
  validateQuestionInput,
} from '@/lib/exam-questions';

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

function createAuthorizedHeaders(token) {
  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseApiResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

export async function fetchExamQuestionsForLecturer(examId, user, token) {
  assertLecturer(user);

  const response = await fetch(`/api/lecturer/exams/${examId}/questions`, {
    method: 'GET',
    headers: createAuthorizedHeaders(token),
    cache: 'no-store',
  });

  return parseApiResponse(response, 'Failed to fetch questions.');
}

export async function createQuestionForLecturer(examId, user, token, values) {
  assertLecturer(user);

  const validation = validateQuestionInput(values);

  if (!validation.isValid) {
    throw new Error(getFirstValidationError(validation));
  }

  const response = await fetch(`/api/lecturer/exams/${examId}/questions`, {
    method: 'POST',
    headers: createAuthorizedHeaders(token),
    body: JSON.stringify(values),
  });

  const data = await parseApiResponse(response, 'Failed to create question.');
  return data.question;
}

export async function updateQuestionForLecturer(examId, questionId, user, token, values) {
  assertLecturer(user);

  const validation = validateQuestionInput(values);

  if (!validation.isValid) {
    throw new Error(getFirstValidationError(validation));
  }

  const response = await fetch(`/api/lecturer/exams/${examId}/questions/${questionId}`, {
    method: 'PATCH',
    headers: createAuthorizedHeaders(token),
    body: JSON.stringify(values),
  });

  const data = await parseApiResponse(response, 'Failed to update question.');
  return data.question;
}

export async function deleteQuestionForLecturer(examId, questionId, user, token) {
  assertLecturer(user);

  const response = await fetch(`/api/lecturer/exams/${examId}/questions/${questionId}`, {
    method: 'DELETE',
    headers: createAuthorizedHeaders(token),
  });

  await parseApiResponse(response, 'Failed to delete question.');
  return true;
}
