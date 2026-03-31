export const QUESTION_OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function createEmptyQuestionForm(orderIndex = 0) {
  return {
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: '1',
    orderIndex: String(orderIndex),
  };
}

export function inflateQuestionOptions(options = []) {
  const nextOptions = [...options];

  while (nextOptions.length < QUESTION_OPTION_LABELS.length) {
    nextOptions.push('');
  }

  return nextOptions.slice(0, QUESTION_OPTION_LABELS.length);
}

export function mapQuestionToFormValues(question) {
  return {
    questionText: question?.question_text || '',
    options: inflateQuestionOptions(question?.options || []),
    correctAnswer: question?.correct_answer || '',
    marks: String(question?.marks ?? 1),
    orderIndex: String(question?.order_index ?? 0),
  };
}

export function validateQuestionInput(values) {
  const errors = {};
  const trimmedQuestion = values.questionText?.trim();
  const trimmedOptions = (values.options || []).map((option) => option.trim());
  const filledOptions = trimmedOptions.filter(Boolean);
  const duplicateOptions = new Set();
  const seenOptions = new Set();
  const trimmedCorrectAnswer = values.correctAnswer?.trim();
  const marks = Number(values.marks);
  const orderIndex = Number(values.orderIndex);

  if (!trimmedQuestion) {
    errors.questionText = 'Question text is required.';
  }

  if (filledOptions.length < 2) {
    errors.options = 'At least 2 options are required.';
  }

  filledOptions.forEach((option) => {
    if (seenOptions.has(option)) {
      duplicateOptions.add(option);
      return;
    }

    seenOptions.add(option);
  });

  if (duplicateOptions.size > 0) {
    errors.options = 'Each option must be unique.';
  }

  if (!trimmedCorrectAnswer) {
    errors.correctAnswer = 'Choose the correct answer.';
  } else if (!filledOptions.includes(trimmedCorrectAnswer)) {
    errors.correctAnswer = 'Correct answer must match one of the provided options.';
  }

  if (!Number.isInteger(marks) || marks <= 0) {
    errors.marks = 'Marks must be a positive whole number.';
  }

  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    errors.orderIndex = 'Order index must be 0 or greater.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeQuestionPayload(values, examId) {
  const options = (values.options || [])
    .map((option) => option.trim())
    .filter(Boolean);

  return {
    exam_id: examId,
    question_text: values.questionText.trim(),
    options,
    correct_answer: values.correctAnswer.trim(),
    marks: Number(values.marks),
    order_index: Number(values.orderIndex),
  };
}

export function sortQuestionsByOrder(questions = []) {
  return [...questions].sort((left, right) => {
    const leftOrder = Number(left.order_index ?? 0);
    const rightOrder = Number(right.order_index ?? 0);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
  });
}

export function getNextQuestionOrderIndex(questions = []) {
  if (questions.length === 0) {
    return 0;
  }

  return questions.reduce((maxOrderIndex, question) => {
    const currentOrder = Number(question.order_index ?? 0);
    return currentOrder > maxOrderIndex ? currentOrder : maxOrderIndex;
  }, 0) + 1;
}
