'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Trash2,
  FileText,
  Globe2,
  PenLine,
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

function DetailTile({ icon: Icon, label, value, tone = 'primary' }) {
  const iconTone =
    tone === 'success'
      ? 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]'
      : 'bg-primary/10 text-primary';

  return (
    <div className="rounded-lg border border-border/80 bg-card p-5 shadow-sm dark:bg-zinc-950/60">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-6 text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScheduleBlock({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 dark:bg-zinc-900/70">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground/85">{value}</p>
    </div>
  );
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
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/exams/${examId}/questions`}>
              <PenLine className="mr-2 h-4 w-4" />
              Manage Questions
            </Link>
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
      contentClassName="mx-auto max-w-7xl"
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/80 bg-card shadow-sm dark:bg-zinc-950/80">
              <CardHeader className="border-b border-border/70 bg-muted/35 p-6 dark:bg-zinc-900/60 sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`h-7 px-3 ${formatStatusTone(exam.is_published)}`}
                      >
                        {exam.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      <div className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background/70 px-3 text-xs font-medium text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Lecturer workspace
                      </div>
                    </div>
                    <CardTitle className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                      {exam.title}
                    </CardTitle>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                      Review the assessment setup, confirm the schedule, and move straight into
                      question authoring or publication.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-5 shadow-sm dark:bg-zinc-950/80">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Availability
                    </p>
                    <p className="mt-3 text-base font-semibold text-foreground">
                      {exam.start_time && exam.end_time ? 'Timed window set' : 'Schedule pending'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {exam.start_time
                        ? 'Students will see this exam during the configured window.'
                        : 'Add a start and end time before publishing to students.'}
                    </p>
                    <div className="mt-5 rounded-lg bg-muted/55 p-4 dark:bg-zinc-900">
                      <p className="text-xs font-medium text-muted-foreground">Duration</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {exam.duration}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">minutes</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <DetailTile icon={Clock3} label="Duration" value={`${exam.duration} minutes`} />
                  <DetailTile icon={FileText} label="Created" value={formatDateTime(exam.created_at)} />
                  <DetailTile
                    icon={Globe2}
                    label="Status"
                    value={exam.is_published ? 'Live for students' : 'Private draft'}
                    tone="success"
                  />
                </div>

                <section className="rounded-lg border border-border/80 bg-background p-6 shadow-sm dark:bg-zinc-950/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">
                    {exam.description || 'No description provided.'}
                  </p>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
                  <section className="rounded-lg border border-border/80 bg-background p-6 shadow-sm dark:bg-zinc-950/50">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Exam Window</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <ScheduleBlock label="Opens" value={formatDateTime(exam.start_time)} />
                          <ScheduleBlock label="Closes" value={formatDateTime(exam.end_time)} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg border border-primary/20 bg-primary p-6 text-primary-foreground shadow-sm">
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
                  </section>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-border/80 bg-card shadow-sm dark:bg-zinc-950/80 xl:sticky xl:top-28">
            <CardContent className="space-y-5 p-6">
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

              <div className={`rounded-lg border p-4 text-sm leading-6 ${formatStatusTone(exam.is_published)}`}>
                <p className="font-semibold">{exam.is_published ? 'Published' : 'Draft'}</p>
                <p className="mt-2 text-foreground/80 dark:text-foreground/75">
                  {exam.is_published
                    ? 'Students can already access this exam during its active window.'
                    : 'This exam is still private and safe to keep refining.'}
                </p>
              </div>

              <Button asChild className="h-11 w-full rounded-lg justify-start">
                <Link href={`/dashboard/exams/${examId}/questions`}>
                  <PenLine className="mr-2 h-4 w-4" />
                  Manage Questions
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-lg justify-start bg-background">
                <Link href={`/dashboard/exams/${examId}/results`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Results
                </Link>
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
