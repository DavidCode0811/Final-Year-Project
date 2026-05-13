'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Search,
  ShieldAlert,
  TimerReset,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMounted } from '@/hooks/use-mounted';
import { supabase } from '@/lib/supabase';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
];

const STATUS_STYLES = {
  Available:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
  Completed:
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300',
  Missed:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300',
  Closed:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300',
};

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
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getExamState(exam) {
  const now = Date.now();
  const startMs = exam.start_time ? new Date(exam.start_time).getTime() : null;
  const endMs = exam.end_time ? new Date(exam.end_time).getTime() : null;
  const submitted = ['submitted', 'auto_submitted'].includes(exam.attempt?.status);

  if (submitted) {
    return 'Completed';
  }

  if (startMs && startMs > now) {
    return 'Hidden';
  }

  if (endMs && endMs < now) {
    return exam.attempt ? 'Closed' : 'Missed';
  }

  return 'Available';
}

function getFilterState(status) {
  if (status === 'Available') return 'active';
  if (status === 'Completed') return 'completed';
  if (status === 'Missed' || status === 'Closed') return 'missed';
  return 'all';
}

function getSubmissionLabel(attempt) {
  if (!attempt) return 'Not started';
  if (attempt.status === 'auto_submitted') return 'Auto submitted';
  if (attempt.status === 'submitted') return 'Submitted';
  if (attempt.status === 'in_progress') return 'In progress';
  return 'Abandoned';
}

function getScoreLabel(exam) {
  if (!exam.attempt || exam.attempt.score == null) {
    return 'Not released';
  }

  const total = exam.totalMarks || 0;
  return total > 0 ? `${exam.attempt.score}/${total}` : String(exam.attempt.score);
}

function ExamBadge({ status }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || STATUS_STYLES.Closed}>
      {status}
    </Badge>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExamDetailDialog({ exam, open, onOpenChange }) {
  if (!exam) {
    return null;
  }

  const status = getExamState(exam);
  const violations = exam.violations || [];
  const answered = exam.answers?.length || 0;
  const correct = exam.answers?.filter((answer) => answer.is_correct).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border-border/80 p-0 sm:top-[5vh] top-[2vh] translate-y-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="flex-shrink-0 border-b border-border/40 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl tracking-tight sm:text-2xl">{exam.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {exam.lecturer?.name || 'Unknown lecturer'} - {exam.duration} minutes
                </DialogDescription>
              </div>
              <ExamBadge status={status} />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 pb-8">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryTile icon={FileQuestion} label="Questions" value={exam.question_count} />
                <SummaryTile icon={CheckCircle2} label="Score" value={getScoreLabel(exam)} />
                <SummaryTile icon={ShieldAlert} label="Warnings" value={violations.length} />
                <SummaryTile icon={TimerReset} label="Answered" value={`${answered}/${exam.question_count}`} />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-border/70 bg-muted/25">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Exam information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Opens</span>
                      <span className="text-right font-medium">{formatDateTime(exam.start_time)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Closes</span>
                      <span className="text-right font-medium">{formatDateTime(exam.end_time)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Submitted</span>
                      <span className="text-right font-medium">
                        {formatDateTime(exam.attempt?.submitted_at || exam.attempt?.end_time)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-muted/25">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Result breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Submission status</span>
                      <span className="font-medium">{getSubmissionLabel(exam.attempt)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Correct answers</span>
                      <span className="font-medium">{exam.attempt ? correct : 'Not available'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Integrity events</span>
                      <span className="font-medium">{violations.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-border/40 px-6 py-5">
            <div className="flex flex-wrap justify-end gap-2">
              {exam.attempt?.status === 'submitted' || exam.attempt?.status === 'auto_submitted' ? (
                <Button asChild>
                  <Link href={`/result/${exam.id}`}>Open result</Link>
                </Button>
              ) : status === 'Available' ? (
                <Button asChild>
                  <Link href={`/exam/${exam.id}`}>Start exam</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentExamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const [exams, setExams] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [selectedExam, setSelectedExam] = useState(null);

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
    if (!mounted || !user?.id || user.role !== 'student') {
      return;
    }

    const loadExams = async () => {
      setFetching(true);
      setError('');

      try {
        const [{ data: examRows, error: examsError }, { data: attemptRows, error: attemptsError }, { data: logRows, error: logsError }] =
          await Promise.all([
            supabase
              .from('exams')
              .select(
                `
                  id,
                  title,
                  description,
                  duration,
                  start_time,
                  end_time,
                  is_active,
                  is_published,
                  lecturer:users!exams_lecturer_id_fkey(name, email),
                  questions(id, marks)
                `
              )
              .eq('is_active', true)
              .eq('is_published', true)
              .order('start_time', { ascending: false, nullsFirst: false }),
            supabase
              .from('exam_attempts')
              .select(
                `
                  id,
                  exam_id,
                  student_id,
                  status,
                  score,
                  started_at,
                  submitted_at,
                  end_time,
                  last_saved_at,
                  answers(id, question_id, selected_answer, is_correct)
                `
              )
              .eq('student_id', user.id),
            supabase
              .from('activity_logs')
              .select('id, exam_id, event_type, timestamp, metadata')
              .eq('user_id', user.id)
              .order('timestamp', { ascending: false }),
          ]);

        if (examsError) throw new Error(examsError.message || 'Failed to load exams.');
        if (attemptsError) throw new Error(attemptsError.message || 'Failed to load attempts.');
        if (logsError) throw new Error(logsError.message || 'Failed to load exam warnings.');

        const attemptsByExam = new Map((attemptRows || []).map((attempt) => [String(attempt.exam_id), attempt]));
        const logsByExam = new Map();

        for (const log of logRows || []) {
          const key = String(log.exam_id);
          logsByExam.set(key, [...(logsByExam.get(key) || []), log]);
        }

        setExams(
          (examRows || []).map((exam) => ({
            ...exam,
            question_count: exam.questions?.length || 0,
            totalMarks: (exam.questions || []).reduce((total, question) => total + Number(question.marks || 0), 0),
            attempt: attemptsByExam.get(String(exam.id)) || null,
            answers: attemptsByExam.get(String(exam.id))?.answers || [],
            violations: logsByExam.get(String(exam.id)) || [],
          }))
        );
      } catch (loadError) {
        setError(loadError.message || 'Failed to load exam history.');
      } finally {
        setFetching(false);
      }
    };

    loadExams();
  }, [mounted, user]);

  const decoratedExams = useMemo(() => {
    return exams
      .map((exam) => ({ ...exam, status: getExamState(exam) }))
      .filter((exam) => exam.status !== 'Hidden');
  }, [exams]);

  const summary = useMemo(() => {
    return {
      active: decoratedExams.filter((exam) => exam.status === 'Available').length,
      completed: decoratedExams.filter((exam) => exam.status === 'Completed').length,
      missed: decoratedExams.filter((exam) => ['Missed', 'Closed'].includes(exam.status)).length,
    };
  }, [decoratedExams]);

  const visibleExams = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return decoratedExams
      .filter((exam) => filter === 'all' || getFilterState(exam.status) === filter)
      .filter((exam) => {
        if (!needle) return true;
        return `${exam.title} ${exam.lecturer?.name || ''}`.toLowerCase().includes(needle);
      })
      .sort((left, right) => {
        if (sort === 'title') return left.title.localeCompare(right.title);
        if (sort === 'score') return Number(right.attempt?.score || -1) - Number(left.attempt?.score || -1);
        const leftDate = new Date(left.attempt?.submitted_at || left.start_time || left.created_at || 0).getTime();
        const rightDate = new Date(right.attempt?.submitted_at || right.start_time || right.created_at || 0).getTime();
        return sort === 'oldest' ? leftDate - rightDate : rightDate - leftDate;
      });
  }, [decoratedExams, filter, search, sort]);

  if (!mounted || loading || !user) {
    return <FullScreenLoader message="Loading your exams..." />;
  }

  if (user.role !== 'student') {
    return <FullScreenLoader message="Redirecting..." />;
  }

  return (
    <PortalShell
      title="Exams"
      showThemeToggle={false}
      contentClassName="mx-auto max-w-7xl"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile icon={BookOpenCheck} label="Active Exams" value={summary.active} />
        <SummaryTile icon={CheckCircle2} label="Completed Exams" value={summary.completed} />
        <SummaryTile icon={AlertCircle} label="Missed/Closed Exams" value={summary.missed} />
      </div>

      <Card className="mt-6 border-border/70 bg-card/90 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-auto flex-wrap justify-start rounded-xl bg-muted/70 p-1">
                {FILTERS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="rounded-lg px-3 py-1.5">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search exams"
                  className="h-10 min-w-[220px] rounded-xl pl-9"
                />
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 rounded-xl sm:w-[170px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {fetching ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading exam history...</div>
          ) : error ? (
            <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to load exams</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : visibleExams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 py-16 text-center">
              <BookOpenCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-foreground">No exams match this view</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different filter or search term.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleExams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExam(exam)}
                  className="group grid gap-4 rounded-2xl border border-border/70 bg-background/65 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-background hover:shadow-lg sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">{exam.title}</h3>
                      <ExamBadge status={exam.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {exam.lecturer?.name || 'Unknown lecturer'} - {exam.question_count} questions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {exam.duration} min
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDateTime(exam.start_time)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {exam.violations.length} warnings
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm sm:min-w-[220px]">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Submission</span>
                      <span className="font-medium text-foreground">{getSubmissionLabel(exam.attempt)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium text-foreground">{getScoreLabel(exam)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Date taken</span>
                      <span className="font-medium text-foreground">
                        {formatDateTime(exam.attempt?.submitted_at || exam.attempt?.end_time)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
        <h2 className="text-sm font-semibold text-foreground">Exam Attempt History</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active, completed, and missed assessments are organized here for a focused student record.
        </p>
      </div>

      <ExamDetailDialog
        exam={selectedExam}
        open={Boolean(selectedExam)}
        onOpenChange={(open) => !open && setSelectedExam(null)}
      />
    </PortalShell>
  );
}
