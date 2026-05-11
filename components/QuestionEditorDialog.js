'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

  return <p className="text-sm text-destructive">{message}</p>;
}

export default function QuestionEditorDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialValues,
  onSubmit,
  onDraftChange,
  submitting = false,
  draftKey = 'default',
}) {
  const saveTimeoutRef = useRef(null);
  const [formValues, setFormValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const STORAGE_KEY = `exam-question-draft-${draftKey}`;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setFormValues(initialValues);
        setFieldErrors({});
        return;
      }

      const parsed = JSON.parse(stored);

      if (parsed?.formValues) {
        setFormValues(parsed.formValues);
        setDraftSavedAt(parsed.savedAt || null);
        setDraftRestored(true);
      } else {
        setFormValues(initialValues);
      }
    } catch {
      setFormValues(initialValues);
    }

    setFieldErrors({});
  }, [open, STORAGE_KEY, initialValues]);

  useEffect(() => {
    if (open) {
      onDraftChange?.(formValues);
    }
  }, [formValues, onDraftChange, open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined;
    }

    clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        const draftPayload = {
          formValues,
          savedAt: new Date().toISOString(),
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftPayload));
        setDraftSavedAt(draftPayload.savedAt);
      } catch (error) {
        console.error('Unable to save question draft:', error);
      }
    }, 600);

    return () => {
      clearTimeout(saveTimeoutRef.current);
    };
  }, [formValues, open, STORAGE_KEY]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      if (!draftRestored && !formValues.questionText && !formValues.options?.some(Boolean)) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [draftRestored, formValues, open]);

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

    try {
      await onSubmit(formValues);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (submitError) {
      throw submitError;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/80 bg-card shadow-2xl shadow-slate-950/10 sm:max-w-2xl dark:bg-card/95 dark:shadow-black/35">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === 'edit' ? 'Edit Question' : 'Add Question'}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            Capture the prompt, answer choices, scoring weight, and display order for this exam question.
          </DialogDescription>
          {(draftRestored || draftSavedAt) && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
              {draftRestored
                ? `Restored draft${draftSavedAt ? ` from ${new Date(draftSavedAt).toLocaleTimeString()}` : ''}.`
                : `Draft saved ${draftSavedAt ? new Date(draftSavedAt).toLocaleTimeString() : 'just now'}.`}
            </div>
          )}
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
              <p className="mt-1 text-sm text-muted-foreground">
                Fill at least two options. Empty option fields will be ignored when saving.
              </p>
            </div>

            <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-2 dark:bg-muted/15">
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
                <SelectTrigger id="correct-answer" className="border-input bg-background shadow-sm transition-colors hover:border-foreground/20 focus:ring-ring/25 dark:bg-muted/35">
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
              className="bg-background/80 hover:bg-muted/70"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
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
