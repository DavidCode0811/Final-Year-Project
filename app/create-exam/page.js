'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock3, FileText } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import LecturerExamForm from '@/components/LecturerExamForm';
import PortalShell from '@/components/PortalShell';
import { Card, CardContent } from '@/components/ui/card';
import { useMounted } from '@/hooks/use-mounted';
import { createLecturerExam } from '@/lib/lecturer-exams';

function LoadingScreen({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export default function CreateExamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  const handleCreateExam = async (values) => {
    setSubmitError('');
    setSubmitting(true);

    try {
      const exam = await createLecturerExam(values, user.id);
      router.push(`/dashboard/exams/${exam.id}`);
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong while creating the exam.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || loading || !user) {
    return <LoadingScreen message="Checking your workspace..." />;
  }

  if (user.role !== 'lecturer') {
    return <LoadingScreen message="Redirecting you to the correct dashboard..." />;
  }

  return (
    <PortalShell
      title="Create New Exam"
      description="Set up a new assessment with a clear schedule, duration, and publication state."
      contentClassName="mx-auto max-w-7xl"
    >
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <LecturerExamForm
          onSubmit={handleCreateExam}
          submitting={submitting}
          error={submitError}
          submitLabel="Create New Exam"
        />

        <Card className="h-fit overflow-hidden border-border/80 bg-card/92 shadow-sm 2xl:sticky 2xl:top-28">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Lecturer Flow
              </p>
              <h2 className="mt-2 text-xl font-semibold">What happens next</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Once the exam is saved, you&apos;ll land on a details screen with the
                schedule and publication settings you just created.
              </p>
            </div>

            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3 2xl:grid-cols-1">
              <div className="flex min-w-0 gap-3 rounded-3xl border border-border/80 bg-muted/35 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm">
                  <FileText className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Description</p>
                  <p className="mt-1 leading-6">
                    Add the student-facing overview and key instructions.
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 gap-3 rounded-3xl border border-border/80 bg-muted/35 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm">
                  <Clock3 className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Duration</p>
                  <p className="mt-1 leading-6">
                    Exams must be greater than zero minutes before they can be saved.
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 gap-3 rounded-3xl border border-border/80 bg-muted/35 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm">
                  <CalendarDays className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Scheduling</p>
                  <p className="mt-1 leading-6">
                    Start and end times are validated so the exam window always makes sense.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
