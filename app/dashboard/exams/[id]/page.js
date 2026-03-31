'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CalendarDays, Clock3, FileText, Plus } from 'lucide-react';
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Card className="border-slate-200 bg-white/90 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-2xl text-slate-950">{exam.title}</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    exam.is_published
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }
                >
                  {exam.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Description
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {exam.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-950">Duration</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {exam.duration} minutes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-950">Created</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {formatDateTime(exam.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-950">Exam Window</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Starts {formatDateTime(exam.start_time)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Ends {formatDateTime(exam.end_time)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/85 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Next Step
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">
                  Exam shell created
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This page confirms the new exam record was inserted into Supabase for your lecturer account.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p className="font-medium text-slate-950">Exam ID</p>
                <p className="mt-2 break-all">{exam.id}</p>
              </div>

              <Button asChild className="w-full bg-slate-950 text-white hover:bg-slate-800">
                <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-slate-300 bg-white">
                <Link href={`/dashboard/exams/${examId}/results`}>View Results</Link>
              </Button>

              <Button
                type="button"
                variant={exam.is_published ? 'outline' : 'default'}
                className={
                  exam.is_published
                    ? 'w-full border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                    : 'w-full bg-emerald-600 text-white hover:bg-emerald-700'
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
