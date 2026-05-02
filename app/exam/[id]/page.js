'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Loader2,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import { ExamTimer } from '@/components/ExamTimer';
import { WarningModal } from '@/components/WarningModal';
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
        <p className="mt-4 text-slate-600">{message}</p>
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
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (!loading && user && user.role !== 'student') {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  useEffect(() => {
    return () => {
      Object.values(saveTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadStudentExam = async () => {
      if (!user || user.role !== 'student' || !token || !examId) {
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
  }, [examId, loading, router, token, user]);

  useEffect(() => {
    if (hasStarted && examId) {
      storeQuestionIndex(examId, currentQuestionIndex);
    }
  }, [currentQuestionIndex, examId, hasStarted]);

  const totalQuestions = exam?.questions?.length || 0;
  const answeredCount = useMemo(() => countAnsweredQuestions(answers), [answers]);
  const progressValue = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
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
    inactivitySeconds,
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

  if (loading || !user) {
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] p-4">
        <Card className="w-full max-w-2xl border-rose-200 bg-white/95 shadow-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Unable to load exam</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {loadError || 'Something went wrong while loading this exam.'}
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <Card className="border-slate-200 bg-white/95 shadow-xl">
            <CardHeader className="space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Student Workspace
              </div>
              <div>
                <CardTitle className="text-3xl text-slate-950">{exam.title}</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                  {exam.description || 'Read the instructions below before starting the exam.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">Duration</p>
                  <p className="mt-1 text-sm text-slate-600">{exam.duration} minutes</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">Questions</p>
                  <p className="mt-1 text-sm text-slate-600">{exam.questions?.length || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">Start Time</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDateTime(exam.start_time)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-950">End Time</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDateTime(exam.end_time)}</p>
                </div>
              </div>

              {!availability.available ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">Exam unavailable</p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">{availability.reason}</p>
                </div>
              ) : null}

              {(exam.questions?.length || 0) === 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="font-medium text-rose-900">Questions not ready</p>
                  <p className="mt-2 text-sm leading-6 text-rose-800">
                    This exam does not have any questions yet, so it cannot be started.
                  </p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-950">What happens when you start</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>A new `exam_attempts` record is created or your in-progress attempt is resumed.</li>
                  <li>Your answers stay in local state first and are autosaved to Supabase.</li>
                  <li>Your progress is also mirrored to localStorage so a refresh can restore it.</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="bg-slate-950 text-white hover:bg-slate-800"
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

                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-300 bg-white"
                  onClick={() => router.push('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(51,65,85,0.3),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <ExamTimer
        remainingSeconds={remainingSeconds}
        violationCount={violationCount}
        tabSwitchCount={tabSwitchCount}
        inactivitySeconds={inactivitySeconds}
        isOffline={isOffline}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="lg:w-80 lg:flex-shrink-0">
          <Card className="border-slate-200 bg-white/92 shadow-sm dark:border-slate-800 dark:bg-slate-950/85 lg:sticky lg:top-6">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-slate-950 dark:text-slate-100">{exam.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Answer one question at a time. Your progress is being autosaved.
                  </CardDescription>
                </div>
              </div>
              <SaveIndicator saveState={saveState} />
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Answered</span>
                  <span>
                    {answeredCount} / {totalQuestions}
                  </span>
                </div>
                <Progress value={progressValue} className="h-2 bg-slate-200" />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-medium text-slate-950 dark:text-slate-100">Exam Window</p>
                <p className="mt-2">Starts {formatDateTime(exam.start_time)}</p>
                <p className="mt-1">Ends {formatDateTime(exam.end_time)}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-slate-100">Questions</p>
                <ScrollArea className="mt-3 max-h-[320px] pr-3">
                  <div className="grid grid-cols-5 gap-2">
                    {exam.questions?.map((question, index) => {
                      const isCurrent = index === currentQuestionIndex;
                      const isAnswered = Boolean(answers[question.id]);

                      return (
                        <Button
                          key={question.id}
                          type="button"
                          variant="outline"
                          className={
                            isCurrent
                              ? 'border-slate-950 bg-slate-950 text-white hover:bg-slate-900'
                              : isAnswered
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                          }
                          onClick={() => handleQuestionJump(index)}
                        >
                          {index + 1}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <Button
                type="button"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
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
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          {currentQuestion ? (
            <Card className="border-slate-200 bg-white/94 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <CardHeader className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Overall progress</span>
                    <span>{Math.round(progressValue)}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2 bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                    <CircleHelp className="h-3.5 w-3.5" />
                    Question {currentQuestionIndex + 1}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {answeredCount} answered so far
                  </div>
                </div>

                <div>
                  <CardTitle className="text-2xl leading-9 text-slate-950 dark:text-slate-100">
                    {currentQuestion.question_text}
                  </CardTitle>
                  <CardDescription className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Choose the best answer below. Your selection autosaves shortly after you click it.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options?.map((option, index) => (
                    <Label
                      key={`${currentQuestion.id}-${index}-${option}`}
                      htmlFor={`question-${currentQuestion.id}-option-${index}`}
                      className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <RadioGroupItem
                        id={`question-${currentQuestion.id}-option-${index}`}
                        value={option}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Option {String.fromCharCode(65 + index)}
                        </p>
                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{option}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-300 bg-white"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="text-sm text-slate-500">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </div>

                  {currentQuestionIndex === totalQuestions - 1 ? (
                    <Button
                      type="button"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
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
                      className="bg-slate-950 text-white hover:bg-slate-800"
                      onClick={handleNext}
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 bg-white/94 shadow-sm">
              <CardContent className="py-16 text-center">
                <CircleHelp className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-4 text-slate-600">No questions are available for this exam.</p>
              </CardContent>
            </Card>
          )}
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
