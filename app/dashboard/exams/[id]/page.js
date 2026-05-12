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
  MoreHorizontal,
  FileText,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { useMounted } from '@/hooks/use-mounted';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const mounted = useMounted();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [exam, setExam] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!mounted || loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'lecturer') {
      router.replace('/dashboard');
    }
  }, [loading, mounted, router, user]);

  useEffect(() => {
    const loadExam = async () => {
      if (!mounted || !user || user.role !== 'lecturer' || !examId) {
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
  }, [examId, mounted, user]);

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

  if (!mounted || loading || !user) {
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
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="bg-background/80">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
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
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/70 bg-card/70 shadow-sm backdrop-blur-xl dark:bg-card/55">
            <CardHeader className="border-b border-border/60 bg-background/35 px-4 py-3 dark:bg-background/20 sm:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-2">
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
                  <CardTitle className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {exam.title}
                  </CardTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 w-9 rounded-xl bg-background/60 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={handlePublishToggle}>
                        {exam.is_published ? 'Unpublish exam' : 'Publish exam'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={handleDeleteExam}>
                        Delete exam
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailTile icon={Clock3} label="Duration" value={`${exam.duration} minutes`} />
              <DetailTile icon={CalendarDays} label="Opens" value={formatDateTime(exam.start_time)} />
              <DetailTile icon={CalendarDays} label="Closes" value={formatDateTime(exam.end_time)} />
              <DetailTile icon={FileText} label="Created" value={formatDateTime(exam.created_at)} />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
            <Card className="overflow-hidden border-border/80 bg-background/60 shadow-sm">
              <CardContent className="space-y-6 p-6">
                <div className="rounded-3xl border border-border/80 bg-card p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Exam window</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ScheduleBlock label="Opens" value={formatDateTime(exam.start_time)} />
                    <ScheduleBlock label="Closes" value={formatDateTime(exam.end_time)} />
                  </div>
                </div>

                <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-6">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/85">
                    {exam.description || 'No description provided.'}
                  </p>
                </section>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-sm">
              <CardHeader className="px-6 py-5">
                <CardTitle className="text-base">Review summary</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Exam status, next actions, and identifying information.
                </p>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className={`rounded-3xl border p-4 ${formatStatusTone(exam.is_published)}`}>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Status</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {exam.is_published ? 'Published' : 'Draft'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">
                    {exam.is_published
                      ? 'Students can access this exam during its active window.'
                      : 'This exam remains private until you publish it.'}
                  </p>
                </div>

                <div className="rounded-3xl border border-border/80 bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Exam ID</p>
                  <p className="mt-3 break-all text-sm text-foreground">{exam.id}</p>
                </div>

                <div className="grid gap-3">
                  <Button asChild className="h-11 w-full rounded-lg justify-start">
                    <Link href={`/dashboard/exams/${examId}/questions`}>
                      <PenLine className="mr-2 h-4 w-4" />
                      Manage questions
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 w-full rounded-lg bg-background/80 justify-start">
                    <Link href={`/dashboard/exams/${examId}/results`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View results
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
