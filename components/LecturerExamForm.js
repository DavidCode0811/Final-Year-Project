'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { defaultExamFormValues, validateExamInput } from '@/lib/lecturer-exams';

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

export default function LecturerExamForm({
  initialValues,
  onSubmit,
  submitLabel = 'Create Exam',
  submitting = false,
  error = '',
}) {
  const [formValues, setFormValues] = useState({
    ...defaultExamFormValues,
    ...initialValues,
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setFormValues({
      ...defaultExamFormValues,
      ...initialValues,
    });
  }, [initialValues]);

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
    await onSubmit(formValues);
  };

  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-slate-950">Exam Setup</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Define the exam basics now. You can handle question authoring and
          other workflows after the assessment shell has been created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-800">
              <AlertTitle>Unable to save exam</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. CSC 401 Final Assessment"
              value={formValues.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a short overview, instructions, or grading note."
              value={formValues.description}
              onChange={(event) => updateField('description', event.target.value)}
              className="min-h-[140px] resize-y"
            />
            <FieldError message={fieldErrors.description} />
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                step="1"
                value={formValues.duration}
                onChange={(event) => updateField('duration', event.target.value)}
              />
              <FieldError message={fieldErrors.duration} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="publish-toggle" className="text-sm font-medium text-slate-950">
                    Publish exam
                  </Label>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Turn this on when students should be able to discover it.
                  </p>
                </div>
                <Switch
                  id="publish-toggle"
                  checked={formValues.isPublished}
                  onCheckedChange={(checked) => updateField('isPublished', checked)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={formValues.startTime}
                onChange={(event) => updateField('startTime', event.target.value)}
              />
              <FieldError message={fieldErrors.startTime} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={formValues.endTime}
                onChange={(event) => updateField('endTime', event.target.value)}
              />
              <FieldError message={fieldErrors.endTime} />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Times are captured using the browser&apos;s local timezone and then
            stored in Supabase as UTC timestamps.
          </div>

          <Button
            type="submit"
            className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Saving exam...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
