'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { QUESTION_OPTION_LABELS, validateQuestionInput } from '@/lib/exam-questions';

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

export default function QuestionEditorDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialValues,
  onSubmit,
  submitting = false,
}) {
  const [formValues, setFormValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (open) {
      setFormValues(initialValues);
      setFieldErrors({});
    }
  }, [initialValues, open]);

  const availableAnswerOptions = useMemo(
    () =>
      (formValues.options || [])
        .map((option, index) => ({
          label: QUESTION_OPTION_LABELS[index],
          value: option.trim(),
        }))
        .filter((option) => option.value),
    [formValues.options]
  );

  const updateField = (field, value) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: '',
      };
    });
  };

  const updateOption = (index, value) => {
    setFormValues((current) => {
      const nextOptions = [...current.options];
      nextOptions[index] = value;

      return {
        ...current,
        options: nextOptions,
      };
    });

    setFieldErrors((current) => ({
      ...current,
      options: '',
      correctAnswer: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validateQuestionInput(formValues);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    await onSubmit(formValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-950">
            {mode === 'edit' ? 'Edit Question' : 'Add Question'}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-600">
            Capture the prompt, answer choices, scoring weight, and display order for this exam question.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text</Label>
            <Textarea
              id="question-text"
              value={formValues.questionText}
              onChange={(event) => updateField('questionText', event.target.value)}
              placeholder="Enter the full question prompt."
              className="min-h-[120px] resize-y"
            />
            <FieldError message={fieldErrors.questionText} />
          </div>

          <div className="space-y-3">
            <div>
              <Label>Options</Label>
              <p className="mt-1 text-sm text-slate-500">
                Fill at least two options. Empty option fields will be ignored when saving.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {QUESTION_OPTION_LABELS.map((label, index) => (
                <div key={label} className="space-y-2">
                  <Label htmlFor={`option-${label}`}>Option {label}</Label>
                  <Input
                    id={`option-${label}`}
                    value={formValues.options[index]}
                    onChange={(event) => updateOption(index, event.target.value)}
                    placeholder={`Enter option ${label}`}
                  />
                </div>
              ))}
            </div>
            <FieldError message={fieldErrors.options} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="correct-answer">Correct Answer</Label>
              <Select
                value={formValues.correctAnswer || undefined}
                onValueChange={(value) => updateField('correctAnswer', value)}
              >
                <SelectTrigger id="correct-answer">
                  <SelectValue placeholder="Select the correct option" />
                </SelectTrigger>
                <SelectContent>
                  {availableAnswerOptions.map((option) => (
                    <SelectItem key={`${option.label}-${option.value}`} value={option.value}>
                      {option.label}: {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.correctAnswer} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marks">Marks</Label>
              <Input
                id="marks"
                type="number"
                min="1"
                step="1"
                value={formValues.marks}
                onChange={(event) => updateField('marks', event.target.value)}
              />
              <FieldError message={fieldErrors.marks} />
            </div>
          </div>

          <div className="space-y-2 sm:max-w-[220px]">
            <Label htmlFor="order-index">Order Index</Label>
            <Input
              id="order-index"
              type="number"
              min="0"
              step="1"
              value={formValues.orderIndex}
              onChange={(event) => updateField('orderIndex', event.target.value)}
            />
            <FieldError message={fieldErrors.orderIndex} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-slate-300 bg-white"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-slate-950 text-white hover:bg-slate-800"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === 'edit'
                ? submitting
                  ? 'Saving changes...'
                  : 'Save Changes'
                : submitting
                  ? 'Adding question...'
                  : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
