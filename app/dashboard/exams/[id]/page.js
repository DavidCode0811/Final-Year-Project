'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  Plus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchLecturerExamById,
  updateLecturerExamPublishStatus,
} from '@/lib/lecturer-exams';

function FullScreenLoader({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
        <p className="mt-4 text-gray-600">{message}</p>
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
    ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
    : 'border-amber-200 bg-amber-50/90 text-amber-700';
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
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href={`/dashboard/exams/${examId}/results`}>View Results</Link>
          </Button>
          <Button
            type="button"
            variant={exam?.is_published ? 'outline' : 'default'}
            className={
              exam?.is_published
                ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
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
          <Button asChild className="bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/create-exam">
              <Plus className="mr-2 h-4 w-4" />
              Create New Exam
            </Link>
          </Button>
        </div>
      }
      contentClassName="mx-auto max-w-5xl"
    >
      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold text-rose-900">Exam unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-rose-800">{error}</p>
            </div>
            <Button asChild variant="outline" className="border-rose-300 bg-white text-rose-800">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_30px_60px_-36px_rgba(15,23,42,0.42)]">
              <CardHeader className="space-y-6 border-b border-slate-200/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(99,102,241,0.08),rgba(14,165,233,0.06))] pb-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className={formatStatusTone(exam.is_published)}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        Exam workspace
                      </div>
                    </div>
                    <CardTitle className="text-3xl font-bold leading-tight text-slate-950">
                      {exam.title}
                    </CardTitle>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                      Review the assessment setup, confirm the schedule, and move straight into
                      question authoring or publication.
                    </p>
                  </div>

                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Duration
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950">
                        {exam.duration}
                        <span className="ml-1 text-base font-medium text-slate-500">mins</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Availability
                      </p>
                      <p className="mt-3 text-sm font-semibold text-slate-950">
                        {exam.start_time && exam.end_time ? 'Timed window set' : 'Schedule pending'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {exam.start_time ? 'Students will see a defined exam window.' : 'Add a start and end time when ready.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-900 p-2.5 text-white shadow-sm">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Duration</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
                          {exam.duration} minutes
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-indigo-600 p-2.5 text-white shadow-sm">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Created</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
                          {formatDateTime(exam.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-emerald-600 p-2.5 text-white shadow-sm">
                        <Globe2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Status</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
                          {exam.is_published ? 'Live for students' : 'Private draft'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Description
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {exam.description || 'No description provided.'}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-950">Exam Window</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Opens
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {formatDateTime(exam.start_time)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Closes
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {formatDateTime(exam.end_time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_26px_60px_-36px_rgba(15,23,42,0.9)]">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      <p className="text-sm font-semibold">Ready for the next step</p>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      The exam shell is set up. You can now add questions, inspect results, or publish when the timing is right.
                    </p>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Exam ID
                      </p>
                      <p className="mt-3 break-all text-sm text-slate-200">{exam.id}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200/80 bg-white/85 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.45)]">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Quick Actions
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">
                  Keep building this assessment
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use these shortcuts to continue authoring, inspect results, or change publication state.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p className="font-medium text-slate-950">Current state</p>
                <p className="mt-2">
                  {exam.is_published
                    ? 'Students can already access this exam during its active window.'
                    : 'This exam is still private and safe to keep refining.'}
                </p>
              </div>

              <Button asChild className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-xl border-slate-300 bg-white">
                <Link href={`/dashboard/exams/${examId}/results`}>View Results</Link>
              </Button>

              <Button
                type="button"
                variant={exam.is_published ? 'outline' : 'default'}
                className={
                  exam.is_published
                    ? 'h-11 w-full rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                    : 'h-11 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700'
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
