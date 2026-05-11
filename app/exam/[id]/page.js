'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  FileText,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import { ExamTimer } from '@/components/ExamTimer';
import { WarningModal } from '@/components/WarningModal';
import { useMounted } from '@/hooks/use-mounted';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  clearStoredExamAnswers,
  clearStoredQuestionIndex,
  countAnsweredQuestions,
  createOrResumeAttempt,
  fetchAttemptAnswers,
  fetchSubmittedStudentAttempt,
  fetchStudentAttempt,
  fetchStudentExam,
  getExamAvailability,
  getStoredExamAnswers,
  getStoredQuestionIndex,
  isAttemptSubmitted,
  logExamActivity,
  saveAttemptAnswer,
  storeExamAnswers,
  storeQuestionIndex,
  submitStudentExam,
} from '@/lib/student-exam';
import { useExamIntegrityMonitor } from '@/lib/use-exam-integrity-monitor';

function FullScreenLoader({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function BriefingMetricCard({ icon: Icon, label, value, description }) {
  return (
    <Card className="border-border/75 bg-card/90 shadow-sm shadow-slate-950/5 backdrop-blur transition-all duration-200 hover:border-foreground/15 hover:shadow-lg hover:shadow-slate-950/10 dark:bg-card/80 dark:shadow-black/20 dark:hover:border-emerald-400/20 dark:hover:shadow-black/30">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-foreground shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
          <p className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {label}
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BriefingRule({ children }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm leading-6 text-foreground/80 dark:bg-muted/20">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      <span>{children}</span>
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

function SaveIndicator({ saveState }) {
  if (saveState.status === 'saving') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving answer...
      </div>
    );
  }

  if (saveState.status === 'error') {
    return (
      <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
        Save failed. We&apos;ll keep your local copy.
      </div>
    );
  }

  if (saveState.status === 'saved' && saveState.lastSavedAt) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        <Save className="h-3.5 w-3.5" />
        Saved {new Date(saveState.lastSavedAt).toLocaleTimeString()}
      </div>
    );
  }

  return null;
}

export default function StudentExamPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [availability, setAvailability] = useState({ available: true, reason: '' });
  const [hasStarted, setHasStarted] = useState(false);
  const [preparingAttempt, setPreparingAttempt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState({
    status: 'idle',
    lastSavedAt: null,
  });

  const saveTimeoutsRef = useRef({});
  const submissionLockRef = useRef(false);

  useEffect(() => {
    if (!mounted || loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'student') {
      router.replace('/dashboard');
    }
  }, [loading, mounted, router, user]);

  useEffect(() => {
    return () => {
      Object.values(saveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadStudentExam = async () => {
      if (!mounted || !user || user.role !== 'student' || !token || !examId) {
        return;
      }

      setLoadingExam(true);
      setLoadError('');

      try {
        const examData = await fetchStudentExam(examId);
        const availabilityState = getExamAvailability(examData);
        const submittedAttempt = await fetchSubmittedStudentAttempt(examId, user.id);

        if (submittedAttempt) {
          router.replace(`/result/${examId}`);
          return;
        }

        const existingAttempt = await fetchStudentAttempt(examId, user.id);

        if (isAttemptSubmitted(existingAttempt)) {
          router.replace(`/result/${examId}`);
          return;
        }

        const remoteAnswers = existingAttempt
          ? await fetchAttemptAnswers(existingAttempt.id)
          : {};
        const storedAnswers = getStoredExamAnswers(examId);
        const mergedAnswers = {
          ...remoteAnswers,
          ...storedAnswers,
        };

        if (!active) {
          return;
        }

        setExam(examData);
        setAvailability(availabilityState);
        setAttempt(existingAttempt);
        setAnswers(mergedAnswers);
        setHasStarted(Boolean(existingAttempt && existingAttempt.status === 'in_progress'));
        setCurrentQuestionIndex(
          Math.min(
            getStoredQuestionIndex(examId),
            Math.max(0, (examData.questions?.length || 1) - 1)
          )
        );
      } catch (error) {
        if (active) {
          setLoadError(error.message || 'Failed to load the exam.');
        }
      } finally {
        if (active) {
          setLoadingExam(false);
        }
      }
    };

    loadStudentExam();

    return () => {
      active = false;
    };
  }, [examId, loading, mounted, router, token, user]);

  useEffect(() => {
    if (hasStarted && examId) {
      storeQuestionIndex(examId, currentQuestionIndex);
    }
  }, [currentQuestionIndex, examId, hasStarted]);

  const totalQuestions = exam?.questions?.length || 0;
  const currentQuestion = exam?.questions?.[currentQuestionIndex] || null;
  const hasExistingAttempt = Boolean(attempt && attempt.status === 'in_progress');

  const flushAnswerSaves = async (attemptId, answerMap) => {
    Object.values(saveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    saveTimeoutsRef.current = {};

    const entries = Object.entries(answerMap || {}).filter(([, value]) => Boolean(value));

    if (entries.length === 0) {
      return;
    }

    await Promise.all(
      entries.map(([questionId, selectedAnswer]) =>
        saveAttemptAnswer(attemptId, questionId, selectedAnswer)
      )
    );

    setSaveState({
      status: 'saved',
      lastSavedAt: new Date().toISOString(),
    });
  };

  const queueAnswerSave = (attemptId, questionId, selectedAnswer) => {
    if (!attemptId || !questionId || !selectedAnswer) {
      return;
    }

    if (saveTimeoutsRef.current[questionId]) {
      clearTimeout(saveTimeoutsRef.current[questionId]);
    }

    setSaveState({
      status: 'saving',
      lastSavedAt: saveState.lastSavedAt,
    });

    saveTimeoutsRef.current[questionId] = setTimeout(async () => {
      try {
        await saveAttemptAnswer(attemptId, questionId, selectedAnswer);
        setSaveState({
          status: 'saved',
          lastSavedAt: new Date().toISOString(),
        });
      } catch (error) {
        setSaveState({
          status: 'error',
          lastSavedAt: null,
        });
        toast.error(error.message || 'Failed to autosave your answer.');
      }
    }, 450);
  };

  const logViolationEvent = async (eventType, metadata = {}) => {
    if (!token || !examId) {
      return;
    }

    await logExamActivity({
      token,
      examId,
      eventType,
      metadata: {
        attemptId: attempt?.id,
        questionIndex: currentQuestionIndex,
        ...metadata,
      },
    });
  };

  const submitExamAttempt = async ({ mode = 'manual', reason = 'manual_submit' }) => {
    if (!attempt?.id || !token) {
      if (mode === 'manual') {
        toast.error('Start the exam before submitting.');
      }
      return false;
    }

    if (submissionLockRef.current) {
      return false;
    }

    submissionLockRef.current = true;
    setSubmitting(true);

    try {
      await flushAnswerSaves(attempt.id, answers);
      await submitStudentExam({
        examId,
        token,
        answers,
        attemptId: attempt.id,
        submissionType: mode === 'auto' ? 'auto' : 'manual',
      });

      clearStoredExamAnswers(examId);
      clearStoredQuestionIndex(examId);

      toast.success(
        mode === 'auto'
          ? `Exam auto-submitted${reason ? `: ${reason.replace(/_/g, ' ')}` : '.'}`
          : 'Exam submitted successfully.'
      );

      router.push(`/result/${examId}`);
      return true;
    } catch (error) {
      const message = error.message || 'Failed to submit exam.';

      if (message.toLowerCase().includes('already submitted')) {
        clearStoredExamAnswers(examId);
        clearStoredQuestionIndex(examId);
        router.push(`/result/${examId}`);
        return true;
      }

      submissionLockRef.current = false;
      setSubmitting(false);
      toast.error(
        mode === 'auto'
          ? message || 'Automatic submission failed. Please stay on this page.'
          : message
      );
      return false;
    }
  };

  const {
    remainingSeconds,
    violationCount,
    tabSwitchCount,
    warning,
    dismissWarning,
    isOffline,
  } = useExamIntegrityMonitor({
    examId,
    attempt,
    durationMinutes: exam?.duration,
    enabled: Boolean(hasStarted && attempt?.id && token && exam?.duration && !submitting),
    onAutoSubmit: async ({ reason }) =>
      submitExamAttempt({
        mode: 'auto',
        reason,
      }),
    onLogViolation: logViolationEvent,
  });

  const handleStartExam = async () => {
    if (!user || !examId || !availability.available) {
      return;
    }

    setPreparingAttempt(true);

    try {
      const attemptData = await createOrResumeAttempt(examId, user.id);
      setAttempt(attemptData);
      setHasStarted(true);
      submissionLockRef.current = false;

      if (!hasExistingAttempt && Object.keys(answers).length > 0) {
        await flushAnswerSaves(attemptData.id, answers);
      }

      toast.success(
        hasExistingAttempt ? 'Resumed your exam attempt.' : 'Exam attempt started.'
      );
    } catch (error) {
      toast.error(error.message || 'Failed to start the exam.');
    } finally {
      setPreparingAttempt(false);
    }
  };

  const handleAnswerChange = (questionId, selectedAnswer) => {
    setAnswers((current) => {
      const nextAnswers = {
        ...current,
        [questionId]: selectedAnswer,
      };

      storeExamAnswers(examId, nextAnswers);
      return nextAnswers;
    });

    if (attempt?.id) {
      queueAnswerSave(attempt.id, questionId, selectedAnswer);
    }
  };

  const handleQuestionJump = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((current) => Math.max(0, current - 1));
  };

  const handleNext = () => {
    setCurrentQuestionIndex((current) =>
      Math.min((exam?.questions?.length || 1) - 1, current + 1)
    );
  };

  const handleSubmitExam = async () => {
    await submitExamAttempt({
      mode: 'manual',
      reason: 'manual_submit',
    });
  };

  if (!mounted || loading || !user) {
    return <FullScreenLoader message="Checking your exam access..." />;
  }

  if (user.role !== 'student') {
    return <FullScreenLoader message="Redirecting you to your dashboard..." />;
  }

  if (loadingExam) {
    return <FullScreenLoader message="Loading exam..." />;
  }

  if (loadError || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl border-rose-200 bg-card/95 shadow-xl shadow-slate-950/10 dark:border-rose-400/30 dark:shadow-black/30">
          <CardContent className="space-y-4 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Unable to load exam</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {loadError || 'Something went wrong while loading this exam.'}
              </p>
            </div>
            <Button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl bg-slate-950 px-4 shadow-sm shadow-slate-950/15 hover:bg-slate-800 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
          <Card className="overflow-hidden border-border/75 bg-card/95 shadow-2xl shadow-slate-950/10 backdrop-blur dark:bg-card/90 dark:shadow-black/30">
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Exam Briefing
                  </div>
                  <div>
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {exam.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                      {exam.description || 'Review the exam details below and start when you are ready.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
                  <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm dark:bg-muted/25">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {availability.available ? 'Ready to start' : 'Unavailable'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm dark:bg-muted/25">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Questions</p>
                    <p className="mt-2 text-base font-semibold text-foreground">{exam.questions?.length || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <BriefingMetricCard
              icon={Clock}
              label="Duration"
              value={`${exam.duration} minutes`}
              description="Complete the exam within the allotted time after starting."
            />
            <BriefingMetricCard
              icon={FileText}
              label="Questions"
              value={exam.questions?.length || 0}
              description="Review each question carefully before submitting."
            />
            <BriefingMetricCard
              icon={TrendingUp}
              label="Window"
              value={availability.available ? 'Open' : 'Closed'}
              description={`${formatDateTime(exam.start_time)} to ${formatDateTime(exam.end_time)}`}
            />
          </div>

          {!availability.available ? (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-sm shadow-amber-950/5 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100 sm:px-5">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Exam not yet available</p>
                  <p className="mt-1 leading-6 text-amber-900/80 dark:text-amber-100/80">{availability.reason}</p>
                </div>
              </div>
            </div>
          ) : null}

          {(exam.questions?.length || 0) === 0 ? (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-4 text-sm text-rose-900 shadow-sm shadow-rose-950/5 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100 sm:px-5">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">No questions available</p>
                  <p className="mt-1 leading-6 text-rose-900/80 dark:text-rose-100/80">
                    This exam does not contain any questions yet, so it cannot be started.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <Card className="border-border/75 bg-card/90 shadow-sm shadow-slate-950/5 backdrop-blur dark:bg-card/80 dark:shadow-black/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/45 text-foreground shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">Exam instructions</CardTitle>
                    <CardDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                      Keep this focused and steady once you begin.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0">
                <BriefingRule>One attempt is recorded for this exam.</BriefingRule>
                <BriefingRule>Your answers are autosaved in the browser and persisted to the server.</BriefingRule>
                <BriefingRule>Refresh or network changes will not erase saved progress.</BriefingRule>
                <BriefingRule>Review all answers before final submission.</BriefingRule>
              </CardContent>
            </Card>

            <Card className="border-amber-200/70 bg-amber-50/75 shadow-sm shadow-amber-950/5 dark:border-amber-400/25 dark:bg-amber-400/10 dark:shadow-black/20">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/60 bg-amber-100/70 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                      Integrity rules
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75">
                      Sentinel monitors tab switching, focus loss, and suspicious inactivity during the attempt.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200/70 bg-background/60 px-4 py-3 text-sm leading-6 text-amber-950/80 dark:border-amber-400/20 dark:bg-background/25 dark:text-amber-100/80">
                  Repeated violations may trigger warnings or automatic submission. Stay on the exam page until you finish.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/75 bg-card/90 shadow-xl shadow-slate-950/10 backdrop-blur dark:bg-card/90 dark:shadow-black/30">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">Ready when you are</p>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Starting creates or resumes your attempt immediately. Your progress will autosave as you work.
                  </p>
                </div>
                <div className="rounded-full border border-border/70 bg-muted/35 px-3 py-1 text-xs font-semibold text-muted-foreground dark:bg-muted/25">
                  {hasExistingAttempt ? 'In progress' : 'Not started'}
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground dark:bg-muted/15 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Attempt</p>
                  <p className="mt-1 leading-6">Created or resumed securely.</p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Autosave</p>
                  <p className="mt-1 leading-6">Stored locally and remotely.</p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Recovery</p>
                  <p className="mt-1 leading-6">Refresh-safe progress.</p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-border/80 bg-background/70 px-4 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted/70 focus-visible:ring-ring/30"
                  onClick={() => router.push('/dashboard')}
                >
                  Back to Dashboard
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-xl bg-slate-950 px-5 text-white shadow-lg shadow-slate-950/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:ring-ring/30 dark:bg-emerald-400 dark:text-emerald-950 dark:shadow-emerald-950/25 dark:hover:bg-emerald-300 sm:min-w-[160px]"
                  onClick={handleStartExam}
                  disabled={
                    preparingAttempt ||
                    !availability.available ||
                    (exam.questions?.length || 0) === 0
                  }
                >
                  {preparingAttempt ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing attempt...
                    </>
                  ) : hasExistingAttempt ? (
                    'Resume Exam'
                  ) : (
                    'Start Exam'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <ExamTimer
        remainingSeconds={remainingSeconds}
        violationCount={violationCount}
        tabSwitchCount={tabSwitchCount}
        isOffline={isOffline}
      />

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="w-full lg:w-80 lg:flex-shrink-0">
          <motion.div
            className="sticky top-8 space-y-6"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/70 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Exam overview</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-100">{exam.title}</h2>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-400">
                <p>Question {currentQuestionIndex + 1} of {totalQuestions}</p>
                <p className="text-slate-400">Answers are auto-saved as you work.</p>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/70 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
                  <span className="text-sm font-semibold">Q</span>
                </span>
                <h3 className="text-sm font-semibold text-slate-200">Navigator</h3>
              </div>
              <ScrollArea className="max-h-64 pr-2">
                <div className="grid grid-cols-6 gap-2">
                  {exam.questions?.map((question, index) => {
                    const isCurrent = index === currentQuestionIndex;
                    const isAnswered = Boolean(answers[question.id]);

                    return (
                      <motion.button
                        key={question.id}
                        type="button"
                        className={`aspect-square rounded-2xl border text-sm font-semibold transition-all duration-200 focus:outline-none ${
                          isCurrent
                            ? 'border-blue-400 bg-blue-500 text-white shadow-[0_16px_50px_-30px_rgba(59,130,246,0.8)]'
                            : isAnswered
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/20'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-700'
                        }`}
                        onClick={() => handleQuestionJump(index)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {index + 1}
                      </motion.button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                className="w-full bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/50 h-11 rounded-2xl font-semibold shadow-lg shadow-slate-950/20 transition-all duration-200 hover:shadow-xl hover:shadow-slate-950/30"
                onClick={handleSubmitExam}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Exam
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </aside>

        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {currentQuestion ? (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/70 p-8 shadow-2xl"
              >
                <div className="mb-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-800 text-slate-300">
                      <CircleHelp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Question</p>
                      <h1 className="mt-2 text-3xl font-semibold text-slate-100 leading-tight">
                        {currentQuestion.question_text}
                      </h1>
                    </div>
                  </div>

                </div>

                <div className="space-y-4">
                  <RadioGroup
                    value={answers[currentQuestion.id] || ''}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {currentQuestion.options?.map((option, index) => {
                      const isSelected = answers[currentQuestion.id] === option;
                      return (
                        <motion.div
                          key={`${currentQuestion.id}-${index}-${option}`}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.05 }}
                        >
                          <Label
                            htmlFor={`question-${currentQuestion.id}-option-${index}`}
                            className={`flex cursor-pointer items-start gap-4 rounded-3xl border p-5 transition-all duration-200 ${
                              isSelected
                                ? 'border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                                : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <RadioGroupItem
                              id={`question-${currentQuestion.id}-option-${index}`}
                              value={option}
                              className="mt-1"
                            />
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Option {String.fromCharCode(65 + index)}
                              </p>
                              <p className="text-base leading-7 text-slate-100">{option}</p>
                            </div>
                          </Label>
                        </motion.div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="text-sm text-slate-400">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </div>

                  {currentQuestionIndex === totalQuestions - 1 ? (
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                      onClick={handleSubmitExam}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Exam
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="bg-slate-700 text-slate-100 hover:bg-slate-600"
                      onClick={handleNext}
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl bg-slate-900/80 border border-slate-800/70 p-16 text-center shadow-2xl"
              >
                <CircleHelp className="mx-auto h-16 w-16 text-slate-500" />
                <h3 className="mt-4 text-2xl font-semibold text-slate-100">No questions are available</h3>
                <p className="mt-2 text-slate-400">This exam doesn't have any questions yet.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <WarningModal
        isOpen={Boolean(warning)}
        title={warning?.title || 'Exam warning'}
        message={warning?.message || ''}
        violationCount={warning?.violationCount ?? violationCount}
        tone={warning?.tone || 'warning'}
        blocking={warning?.blocking || false}
        onDismiss={warning?.blocking ? undefined : dismissWarning}
      />
    </div>
  );
}
