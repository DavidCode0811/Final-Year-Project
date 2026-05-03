'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Trash2,
  FileText,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  deleteLecturerExam,
  fetchLecturerExamById,
  updateLecturerExamPublishStatus,
} from '@/lib/lecturer-exams';

function FullScreenLoader({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatusTone(isPublished) {
  return isPublished
    ? 'border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
    : 'border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]';
}

export default function LecturerExamDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [exam, setExam] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (!loading && user && user.role !== 'lecturer') {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  useEffect(() => {
    const loadExam = async () => {
      if (!user || user.role !== 'lecturer' || !examId) {
        return;
      }

      setLoadingExam(true);
      setError('');

      try {
        const data = await fetchLecturerExamById(examId, user.id);
        setExam(data);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load this exam.');
      } finally {
        setLoadingExam(false);
      }
    };

    loadExam();
  }, [examId, user]);

  const handlePublishToggle = async () => {
    if (!exam || !user) {
      return;
    }

    setPublishing(true);

    try {
      const updatedExam = await updateLecturerExamPublishStatus(
        exam.id,
        user.id,
        !exam.is_published
      );

      setExam(updatedExam);
      toast.success(
        updatedExam.is_published
          ? 'Exam published successfully.'
          : 'Exam moved back to draft.'
      );
    } catch (publishError) {
      toast.error(
        publishError.message || 'Unable to update the exam publishing status.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!exam || !user || deleting) {
      return;
    }

    const confirmed = window.confirm(
      'Delete this exam? This will permanently remove the exam and its related records.'
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await deleteLecturerExam(exam.id, user.id);
      toast.success('Exam deleted successfully.');
      router.push('/dashboard');
    } catch (deleteError) {
      toast.error(deleteError.message || 'Unable to delete this exam.');
      setDeleting(false);
    }
  };

  if (loading || !user) {
    return <FullScreenLoader message="Checking your workspace..." />;
  }

  if (user.role !== 'lecturer') {
    return <FullScreenLoader message="Redirecting you to your dashboard..." />;
  }

  if (loadingExam) {
    return <FullScreenLoader message="Loading exam details..." />;
  }

  return (
    <PortalShell
      title={exam?.title || 'Exam Details'}
      description="Review the assessment metadata you just created and confirm the publishing window."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="bg-background/80">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="bg-background/80">
            <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
          </Button>
          <Button asChild variant="outline" className="bg-background/80">
            <Link href={`/dashboard/exams/${examId}/results`}>View Results</Link>
          </Button>
          <Button
            type="button"
            variant={exam?.is_published ? 'outline' : 'default'}
            className={
              exam?.is_published
                ? 'border-[hsl(var(--warning)/0.45)] bg-background text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.12)]'
                : 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success)/0.9)]'
            }
            onClick={handlePublishToggle}
            disabled={publishing || !exam}
          >
            {publishing
              ? exam?.is_published
                ? 'Unpublishing...'
                : 'Publishing...'
              : exam?.is_published
                ? 'Unpublish Exam'
                : 'Publish Exam'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteExam}
            disabled={deleting || !exam}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? 'Deleting Exam...' : 'Delete Exam'}
          </Button>
        </div>
      }
      contentClassName="mx-auto max-w-5xl"
    >
      {error ? (
        <Card className="border-destructive/30 bg-destructive/10 shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold text-destructive">Exam unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-destructive">{error}</p>
            </div>
            <Button asChild variant="outline" className="border-destructive/30 bg-background text-destructive hover:bg-destructive/10">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/80 bg-card/95 shadow-[0_30px_60px_-36px_hsl(var(--foreground)/0.35)]">
              <CardHeader className="space-y-6 border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--muted)/0.72),hsl(var(--primary)/0.08),hsl(var(--accent)/0.48))] pb-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className={formatStatusTone(exam.is_published)}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Exam workspace
                      </div>
                    </div>
                    <CardTitle className="text-3xl font-bold leading-tight text-foreground">
                      {exam.title}
                    </CardTitle>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                      Review the assessment setup, confirm the schedule, and move straight into
                      question authoring or publication.
                    </p>
                  </div>

                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-lg border border-border bg-background/75 p-4 shadow-sm backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Duration
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">
                        {exam.duration}
                        <span className="ml-1 text-base font-medium text-muted-foreground">mins</span>
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/75 p-4 shadow-sm backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Availability
                      </p>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {exam.start_time && exam.end_time ? 'Timed window set' : 'Schedule pending'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {exam.start_time ? 'Students will see a defined exam window.' : 'Add a start and end time when ready.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border/80 bg-muted/45 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary p-2.5 text-primary-foreground shadow-sm">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Duration</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {exam.duration} minutes
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/45 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/15 p-2.5 text-primary shadow-sm">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Created</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatDateTime(exam.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/45 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-[hsl(var(--success)/0.16)] p-2.5 text-[hsl(var(--success))] shadow-sm">
                        <Globe2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {exam.is_published ? 'Live for students' : 'Private draft'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/55 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">
                    {exam.description || 'No description provided.'}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-border/80 bg-background/55 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Exam Window</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-muted/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Opens
                            </p>
                            <p className="mt-2 text-sm leading-6 text-foreground/85">
                              {formatDateTime(exam.start_time)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Closes
                            </p>
                            <p className="mt-2 text-sm leading-6 text-foreground/85">
                              {formatDateTime(exam.end_time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary p-6 text-primary-foreground shadow-[0_26px_60px_-36px_hsl(var(--foreground)/0.7)]">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="text-sm font-semibold">Ready for the next step</p>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-primary-foreground/75">
                      The exam shell is set up. You can now add questions, inspect results, or publish when the timing is right.
                    </p>
                    <div className="mt-6 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/65">
                        Exam ID
                      </p>
                      <p className="mt-3 break-all text-sm text-primary-foreground/90">{exam.id}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 bg-card/90 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.4)]">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Quick Actions
                </p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">
                  Keep building this assessment
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use these shortcuts to continue authoring, inspect results, or change publication state.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">Current state</p>
                <p className="mt-2">
                  {exam.is_published
                    ? 'Students can already access this exam during its active window.'
                    : 'This exam is still private and safe to keep refining.'}
                </p>
              </div>

              <Button asChild className="h-11 w-full rounded-lg">
                <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-lg bg-background">
                <Link href={`/dashboard/exams/${examId}/results`}>View Results</Link>
              </Button>

              <Button
                type="button"
                variant={exam.is_published ? 'outline' : 'default'}
                className={
                  exam.is_published
                    ? 'h-11 w-full rounded-lg border-[hsl(var(--warning)/0.45)] bg-background text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.12)]'
                    : 'h-11 w-full rounded-lg bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success)/0.9)]'
                }
                onClick={handlePublishToggle}
                disabled={publishing}
              >
                {publishing
                  ? exam.is_published
                    ? 'Unpublishing...'
                    : 'Publishing...'
                  : exam.is_published
                    ? 'Unpublish Exam'
                    : 'Publish Exam'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
