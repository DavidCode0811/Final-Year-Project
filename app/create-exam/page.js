'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock3, FileText } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import LecturerExamForm from '@/components/LecturerExamForm';
import PortalShell from '@/components/PortalShell';
import { Card, CardContent } from '@/components/ui/card';
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (!loading && user && user.role !== 'lecturer') {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

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

  if (loading || !user) {
    return <LoadingScreen message="Checking your workspace..." />;
  }

  if (user.role !== 'lecturer') {
    return <LoadingScreen message="Redirecting you to the correct dashboard..." />;
  }

  return (
    <PortalShell
      title="Create New Exam"
      description="Set up a new assessment with a clear schedule, duration, and publication state."
      contentClassName="mx-auto max-w-6xl"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <LecturerExamForm
          onSubmit={handleCreateExam}
          submitting={submitting}
          error={submitError}
          submitLabel="Create New Exam"
        />

        <Card className="border-slate-200 bg-white/85 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Lecturer Flow
              </p>
              <h2 className="mt-2 text-xl font-semibold">What happens next</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Once the exam is saved, you&apos;ll land on a details screen with the
                schedule and publication settings you just created.
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <FileText className="mt-0.5 h-4 w-4 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-950">Description</p>
                  <p className="mt-1 leading-6">
                    Add the student-facing overview and key instructions.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Clock3 className="mt-0.5 h-4 w-4 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-950">Duration</p>
                  <p className="mt-1 leading-6">
                    Exams must be greater than zero minutes before they can be saved.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CalendarDays className="mt-0.5 h-4 w-4 text-slate-700" />
                <div>
                  <p className="font-medium text-slate-950">Scheduling</p>
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
