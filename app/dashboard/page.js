'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RadioTower,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  deleteLecturerExam,
  fetchLecturerExams,
  updateLecturerExamPublishStatus,
} from '@/lib/lecturer-exams';
import { supabase } from '@/lib/supabase';

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

function formatExamDate(value) {
  if (!value) {
    return 'Date TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getExamDisplayStatus(exam) {
  const endMs = exam.end_time ? new Date(exam.end_time).getTime() : null;

  if (endMs != null && !Number.isNaN(endMs) && endMs < Date.now()) {
    return {
      label: 'Closed',
      className: 'border-border/80 bg-muted/70 text-muted-foreground',
    };
  }

  if (exam.is_published) {
    return {
      label: 'Published',
      className:
        'border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
    };
  }

  return {
    label: 'Draft',
    className:
      'border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
  };
}

function getStudentExamStatus(exam) {
  const now = Date.now();
  const startsAt = exam.start_time ? new Date(exam.start_time).getTime() : null;
  const endsAt = exam.end_time ? new Date(exam.end_time).getTime() : null;

  if (endsAt != null && !Number.isNaN(endsAt) && endsAt < now) {
    return {
      label: 'Closed',
      className: 'border-border/70 bg-muted/70 text-muted-foreground',
    };
  }

  if (startsAt != null && !Number.isNaN(startsAt) && startsAt > now) {
    return {
      label: 'Upcoming',
      className:
        'border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
    };
  }

  return {
    label: 'Available',
    className:
      'border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  };
}

function StudentStatCard({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-muted/60 text-foreground',
    emerald: 'bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))]',
    amber: 'bg-[hsl(var(--warning)/0.18)] text-[hsl(var(--warning))]',
    indigo: 'bg-primary/15 text-primary',
  };

  return (
    <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm transition-all duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LecturerExamCard({ exam, lecturerId, onMergeExam, onRequestDelete }) {
  const [publishBusy, setPublishBusy] = useState(false);
  const status = getExamDisplayStatus(exam);
  const description = (exam.description || '').trim() || 'No description yet.';

  const handlePublishToggle = async () => {
    setPublishBusy(true);
    try {
      const nextPublished = !exam.is_published;
      const updated = await updateLecturerExamPublishStatus(
        exam.id,
        lecturerId,
        nextPublished
      );
      onMergeExam(updated);
      toast.success(nextPublished ? 'Exam published.' : 'Exam unpublished.');
    } catch (err) {
      toast.error(err.message || 'Could not update publication status.');
    } finally {
      setPublishBusy(false);
    }
  };

  return (
    <div className="group relative flex h-full min-h-[248px] flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_16px_48px_-16px_rgba(15,23,42,0.18)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
            {exam.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            <Badge
              variant="outline"
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}
            >
              {status.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-muted/80 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Exam actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/70 bg-card/95 dark:border-slate-700 dark:bg-slate-900/95">
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-muted/70 dark:hover:bg-slate-800">
                  <Link href={`/dashboard/exams/${exam.id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit exam
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-muted/70 dark:hover:bg-slate-800">
                  <Link href={`/dashboard/exams/${exam.id}/results`}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View results
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50 dark:bg-slate-700" />
                <DropdownMenuItem
                  disabled={publishBusy}
                  className="rounded-lg cursor-pointer hover:bg-muted/70 dark:hover:bg-slate-800 disabled:opacity-50"
                  onClick={() => void handlePublishToggle()}
                >
                  {exam.is_published ? 'Unpublish' : 'Publish'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50 dark:bg-slate-700" />
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onRequestDelete(exam)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="mt-3 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <dt className="sr-only">Duration</dt>
            <dd className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <span className="font-medium tabular-nums text-foreground/90">{exam.duration} min</span>
            </dd>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <dt className="sr-only">Exam date</dt>
            <dd className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <span className="font-medium text-foreground/90">{formatExamDate(exam.start_time)}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-8">
          <Button
            asChild
            className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Link href={`/dashboard/exams/${exam.id}`}>Open exam</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LecturerExamGridSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[248px] flex-col rounded-2xl border border-border/40 bg-card/60 p-6"
        >
          <div className="flex justify-between gap-3">
            <Skeleton className="h-6 w-[65%]" />
            <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-10 w-[55%] rounded-lg" />
            <Skeleton className="h-10 w-[45%] rounded-lg" />
          </div>
          <Skeleton className="mt-auto h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-muted text-foreground',
    emerald: 'bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))]',
    amber: 'bg-[hsl(var(--warning)/0.18)] text-[hsl(var(--warning))]',
    indigo: 'bg-primary/15 text-primary',
  };

  return (
    <Card className="rounded-2xl border-border/50 bg-card/95 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5 md:p-6">
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactStatCard({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-muted/70 text-foreground',
    emerald: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
    amber: 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
    indigo: 'bg-primary/10 text-primary',
  };

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StudentExamCard({ exam }) {
  const status = getStudentExamStatus(exam);

  return (
    <Card className="group flex h-full flex-col rounded-[28px] border border-border/70 bg-card/95 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] dark:hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)]">
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{exam.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">By {exam.lecturer?.name || 'Unknown'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${status.className}`}
            >
              {status.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-muted/80 hover:text-foreground dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Exam actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/70 bg-card/95 dark:border-slate-700 dark:bg-slate-900/95">
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-muted/70 dark:hover:bg-slate-800">
                  <Link href={`/exam/${exam.id}`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Start exam
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50 dark:bg-slate-700" />
                <DropdownMenuItem className="rounded-lg cursor-pointer hover:bg-muted/70 dark:hover:bg-slate-800 text-muted-foreground dark:text-slate-400">
                  <FileText className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-muted/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground dark:text-slate-400">Duration</p>
            <p className="mt-3 text-lg font-semibold text-foreground dark:text-slate-100">{exam.duration} min</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-muted/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground dark:text-slate-400">Questions</p>
            <p className="mt-3 text-lg font-semibold text-foreground dark:text-slate-100">{exam.question_count}</p>
          </div>
        </div>

        <div className="mt-auto">
          <Button
            asChild
            className="h-11 w-full rounded-2xl bg-slate-950 text-white transition duration-200 hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Link href={`/exam/${exam.id}`}>Start exam</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LecturerDashboardView({ user }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadExams = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchLecturerExams(user.id);

        if (active) {
          setExams(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Failed to load exams.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadExams();

    return () => {
      active = false;
    };
  }, [user.id]);

  const handleReload = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchLecturerExams(user.id);
      setExams(data);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load exams.');
    } finally {
      setLoading(false);
    }
  };

  const mergeExam = (updated) => {
    setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await deleteLecturerExam(deleteTarget.id, user.id);
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success('Exam deleted.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete exam.');
    } finally {
      setDeleting(false);
    }
  };

  const publishedCount = exams.filter((exam) => exam.is_published).length;
  const draftCount = exams.length - publishedCount;

  return (
    <>
      <PortalShell
        title="Lecturer dashboard"
        description="Create assessments, publish when ready, and review cohort performance."
        showThemeToggle={true}
        actions={
          <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
            <Link href="/create-exam">
              <Plus className="mr-2 h-4 w-4" />
              New exam
            </Link>
          </Button>
        }
        contentClassName="mx-auto max-w-7xl"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon={BookOpen} label="Total exams" value={exams.length} />
          <SummaryCard icon={RadioTower} label="Published" value={publishedCount} tone="emerald" />
          <SummaryCard icon={FileText} label="Drafts" value={draftCount} tone="amber" />
        </div>

        <div className="mt-10 sm:mt-12">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Your exams</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A minimal overview — open an exam for full schedule and settings.
          </p>
        </div>

        {loading ? (
          <LecturerExamGridSkeleton />
        ) : error ? (
          <Alert className="mt-10 border-destructive/30 bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>We couldn&apos;t load your exams</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button
                type="button"
                variant="outline"
                className="border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
                onClick={handleReload}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : exams.length === 0 ? (
          <Card className="mt-10 rounded-2xl border-dashed border-border/80 bg-card/60">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80">
                <BookOpen className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">No exams yet</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Create your first exam to add questions, set the window, and publish to students.
              </p>
              <Button asChild className="mt-8 rounded-xl px-6">
                <Link href="/create-exam">
                  <Plus className="mr-2 h-4 w-4" />
                  Create exam
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-10 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
              <LecturerExamCard
                key={exam.id}
                exam={exam}
                lecturerId={user.id}
                onMergeExam={mergeExam}
                onRequestDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </PortalShell>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{' '}
              <span className="font-medium text-foreground">{deleteTarget?.title}</span> and related
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StudentDashboardView({ user }) {
  const [exams, setExams] = useState([]);
  const [fetchingExams, setFetchingExams] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    availableExams: 0,
    completedExams: 0,
    violations: 0,
    averageScore: 'N/A',
  });

  useEffect(() => {
    const fetchAvailableExams = async () => {
      setFetchingExams(true);
      setError('');

      try {
        const response = await fetch('/api/exams');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch exams.');
        }

        const availableExams = data.exams || [];
        setExams(availableExams);

        const [{ data: attempts, error: attemptsError }, { count: violationsCount, error: logsError }] =
          await Promise.all([
            supabase
              .from('exam_attempts')
              .select('id, score')
              .eq('student_id', user.id)
              .in('status', ['submitted', 'auto_submitted']),
            supabase
              .from('activity_logs')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .in('event_type', ['tab_switch', 'inactive', 'multi_tab']),
          ]);

        if (attemptsError) {
          throw new Error(attemptsError.message || 'Failed to load exam attempt summary.');
        }

        if (logsError) {
          throw new Error(logsError.message || 'Failed to load violation summary.');
        }

        const completedExams = (attempts || []).length;
        const scoredAttempts = (attempts || []).filter((attempt) => Number.isFinite(Number(attempt.score)));
        const averageScore = scoredAttempts.length
          ? `${Math.round(
              scoredAttempts.reduce((total, attempt) => total + Number(attempt.score || 0), 0) /
                scoredAttempts.length
            )}%`
          : 'N/A';

        setSummary({
          availableExams: availableExams.length,
          completedExams,
          violations: violationsCount || 0,
          averageScore,
        });
      } catch (fetchError) {
        setError(fetchError.message || 'Failed to fetch exams.');
      } finally {
        setFetchingExams(false);
      }
    };

    fetchAvailableExams();
  }, [user.id]);

  return (
    <PortalShell
      title={`Welcome back, ${user.name}`}
      description="Your published exams are ready to launch."
      showThemeToggle={true}
      contentClassName="mx-auto max-w-7xl"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StudentStatCard icon={BookOpen} label="Available exams" value={summary.availableExams} tone="indigo" />
        <StudentStatCard icon={CheckCircle2} label="Completed" value={summary.completedExams} tone="emerald" />
        <StudentStatCard icon={AlertTriangle} label="Warnings" value={summary.violations} tone="amber" />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Available exams</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Launch your active assessments with a single tap.
          </p>
        </div>
      </div>

      {fetchingExams ? (
        <Card className="mt-6 border-border/70 bg-card/90 shadow-sm">
          <CardContent className="py-14 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading available exams…</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert className="mt-6 border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load exams</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : exams.length === 0 ? (
        <Card className="mt-6 rounded-3xl border-border/70 bg-card/90 p-10 text-center shadow-sm">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-6 text-xl font-semibold text-foreground">No exams are available</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your instructor hasn&apos;t published any exams yet. Check back soon.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const status = getStudentExamStatus(exam);

            return (
              <article
                key={exam.id}
                className="group flex min-h-[220px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.3)]"
              >
                <div className="flex items-start justify-between gap-4 p-6">
                  <div className="min-w-0 space-y-2">
                    <h3 className="truncate text-lg font-semibold text-foreground">{exam.title}</h3>
                    <p className="text-sm text-muted-foreground">By {exam.lecturer?.name || 'Unknown'}</p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-auto space-y-4 border-t border-border/70 p-6 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground/90">{exam.duration} min</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground/90">{exam.question_count || 0} questions</span>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Link href={`/exam/${exam.id}`}>{status.label === 'Closed' ? 'View exam' : 'Start exam'}</Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <FullScreenLoader message="Loading your dashboard..." />;
  }

  if (user.role === 'lecturer') {
    return <LecturerDashboardView user={user} />;
  }

  return <StudentDashboardView user={user} />;
}
