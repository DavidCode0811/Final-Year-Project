'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock3, FileText, Loader2, RadioTower } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { defaultExamFormValues, validateExamInput } from '@/lib/lecturer-exams';
import { cn } from '@/lib/utils';

const DRAFT_STORAGE_KEY = 'lecturer-exam-draft-v1';
const AUTO_SAVE_DELAY_MS = 750;

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

function SetupHint({ icon: Icon, title, description }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 shadow-sm shadow-slate-950/5 dark:bg-muted/25 dark:shadow-black/15">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-foreground shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FormField({ id, label, error, children, className = '' }) {
  return (
    <div className={`min-w-0 space-y-2 ${className}`.trim()}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export default function LecturerExamForm({
  initialValues,
  onSubmit,
  submitLabel = 'Create Exam',
  submitting = false,
  error = '',
}) {
  const initialFormState = useMemo(
    () => ({
      ...defaultExamFormValues,
      ...initialValues,
    }),
    [initialValues]
  );

  const [formValues, setFormValues] = useState(initialFormState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveState, setSaveState] = useState({ status: 'idle', lastSavedAt: null });
  const [draftRestored, setDraftRestored] = useState(false);
  const saveTimeoutRef = useRef(null);

  const isDirty = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(initialFormState),
    [formValues, initialFormState]
  );

  useEffect(() => {
    setFormValues(initialFormState);
  }, [initialFormState]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      if (parsed?.formValues) {
        setFormValues({
          ...initialFormState,
          ...parsed.formValues,
        });

        setSaveState({
          status: 'saved',
          lastSavedAt: parsed.savedAt || null,
        });
        setDraftRestored(true);
      }
    } catch {
      // Ignore invalid draft payloads.
    }
  }, [initialFormState]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      if (!isDirty) {
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
  }, [isDirty]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        const draftPayload = {
          formValues,
          savedAt: new Date().toISOString(),
        };

        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));

        setSaveState({
          status: 'saved',
          lastSavedAt: draftPayload.savedAt,
        });
      } catch (error) {
        console.error('Unable to save exam draft:', error);
        setSaveState((current) => ({
          status: 'error',
          lastSavedAt: current.lastSavedAt,
        }));
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      clearTimeout(saveTimeoutRef.current);
    };
  }, [formValues]);

  const clearDraft = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setSaveState({ status: 'idle', lastSavedAt: null });
    setDraftRestored(false);
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validateExamInput(formValues);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});

    try {
      await onSubmit(formValues);
      clearDraft();
    } catch (submitError) {
      throw submitError;
    }
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm shadow-slate-950/5 dark:bg-card/90 dark:shadow-black/25">
      <CardHeader className="border-b border-border/70 bg-gradient-to-br from-background via-background to-muted/30 px-5 py-6 sm:px-6 lg:px-8 dark:from-card dark:via-card dark:to-muted/25">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Assessment Builder
            </p>
            <CardTitle className="text-2xl text-foreground sm:text-3xl">Exam Setup</CardTitle>
            <CardDescription className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Define the assessment shell with a clear title, timing window, and publication
              status. You can move into question authoring right after this step.
            </CardDescription>
            {draftRestored || saveState.status !== 'idle' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
                {draftRestored
                  ? `Draft restored${saveState.lastSavedAt ? ` from ${new Date(saveState.lastSavedAt).toLocaleString()}` : ''}.`
                  : saveState.status === 'saving'
                  ? 'Saving draft…'
                  : saveState.status === 'saved'
                  ? `Draft saved ${saveState.lastSavedAt ? new Date(saveState.lastSavedAt).toLocaleTimeString() : ''}`
                  : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[340px] xl:grid-cols-1">
            <SetupHint
              icon={FileText}
              title="Clear structure"
              description="Keep titles and instructions concise so students understand the assessment immediately."
            />
            <SetupHint
              icon={CalendarDays}
              title="Timezone aware"
              description="Schedule fields use the browser timezone and are stored consistently for delivery."
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-6 sm:px-6 lg:px-8">
        <form className="space-y-6 lg:space-y-8" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
              <AlertTitle>Unable to save exam</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
            <FormField id="title" label="Title" error={fieldErrors.title}>
              <Input
                id="title"
                placeholder="e.g. CSC 401 Final Assessment"
                value={formValues.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="w-full"
              />
            </FormField>

            <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/25 p-3 shadow-sm shadow-slate-950/5 transition-colors dark:bg-muted/20 dark:shadow-black/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-foreground shadow-sm">
                    <RadioTower className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="publish-toggle" className="text-sm font-semibold text-foreground">
                      Publish exam
                    </Label>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      Make this exam visible to students.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:pl-3">
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                      formValues.isPublished
                        ? 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200'
                        : 'border-border/80 bg-background/70 text-muted-foreground'
                    )}
                  >
                    {formValues.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <Switch
                    id="publish-toggle"
                    checked={formValues.isPublished}
                    onCheckedChange={(checked) => updateField('isPublished', checked)}
                    aria-label="Publish exam"
                  />
                </div>
              </div>
            </div>
          </div>

          <FormField id="description" label="Description" error={fieldErrors.description}>
            <Textarea
              id="description"
              placeholder="Add a short overview, instructions, or grading note."
              value={formValues.description}
              onChange={(event) => updateField('description', event.target.value)}
              className="min-h-[160px] w-full resize-y"
            />
          </FormField>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            <FormField id="duration" label="Duration (minutes)" error={fieldErrors.duration}>
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  step="1"
                  value={formValues.duration}
                  onChange={(event) => updateField('duration', event.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </FormField>

            <div className="rounded-3xl border border-border/80 bg-muted/30 p-4 sm:p-5 lg:col-span-2 dark:bg-muted/20">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-border/80 bg-background/75 p-4 shadow-sm shadow-slate-950/5 dark:bg-background/45 dark:shadow-black/15">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Access State
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {formValues.isPublished ? 'Visible to students' : 'Private draft'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    You can still edit questions and details after creating the exam.
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl border border-border/80 bg-background/75 p-4 shadow-sm shadow-slate-950/5 dark:bg-background/45 dark:shadow-black/15">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Timing Rule
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">Window must make sense</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The end time must be later than the start time before the exam can be saved.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
            <FormField id="start-time" label="Start Time" error={fieldErrors.startTime}>
              <Input
                id="start-time"
                type="datetime-local"
                value={formValues.startTime}
                onChange={(event) => updateField('startTime', event.target.value)}
                className="w-full"
              />
            </FormField>

            <FormField id="end-time" label="End Time" error={fieldErrors.endTime}>
              <Input
                id="end-time"
                type="datetime-local"
                value={formValues.endTime}
                onChange={(event) => updateField('endTime', event.target.value)}
                className="w-full"
              />
            </FormField>
          </div>

          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 sm:p-5 dark:border-amber-400/25 dark:bg-amber-400/10">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Scheduling note</p>
            <p className="mt-2 text-sm leading-6 text-amber-900/90 dark:text-amber-100/85">
              Times are captured using the browser&apos;s local timezone and then stored in
              Supabase as UTC timestamps to keep delivery consistent across devices.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Create the exam shell first, then continue to question authoring, review, and
              publication controls on the next screen.
            </p>

            <Button type="submit" className="w-full sm:w-auto sm:min-w-[200px]" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Saving exam...' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
