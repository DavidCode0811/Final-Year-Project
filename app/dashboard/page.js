'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LineChart,
  Plus,
  RadioTower,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchLecturerExams } from '@/lib/lecturer-exams';
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

function formatDateTime(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function SummaryCard({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-muted text-foreground',
    emerald: 'bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))]',
    amber: 'bg-[hsl(var(--warning)/0.18)] text-[hsl(var(--warning))]',
    indigo: 'bg-primary/15 text-primary',
  };

  return (
    <Card className="border-border/80 bg-card/90 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LecturerDashboardView({ user }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const publishedCount = exams.filter((exam) => exam.is_published).length;
  const draftCount = exams.length - publishedCount;

  return (
    <PortalShell
      title="Lecturer Dashboard"
      description="Review the exams you own, publish them when ready, and create new assessment windows."
      actions={
        <Button asChild>
          <Link href="/create-exam">
            <Plus className="mr-2 h-4 w-4" />
            Create New Exam
          </Link>
        </Button>
      }
      contentClassName="mx-auto max-w-7xl"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={BookOpen} label="Total Exams" value={exams.length} />
        <SummaryCard icon={RadioTower} label="Published" value={publishedCount} tone="emerald" />
        <SummaryCard icon={FileText} label="Drafts" value={draftCount} tone="amber" />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Exams</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Each card below shows the exam schedule, duration, and publication state.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/create-exam">Create New Exam</Link>
        </Button>
      </div>

      {loading ? (
        <Card className="mt-6 border-border/80 bg-card/90 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your exams...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert className="mt-6 border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>We couldn&apos;t load the lecturer dashboard</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
              onClick={handleReload}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      ) : exams.length === 0 ? (
        <Card className="mt-6 border-dashed border-border bg-card/75">
          <CardContent className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No exams yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Create your first exam to start building out your assessment schedule.
            </p>
            <Button asChild className="mt-6">
              <Link href="/create-exam">Create New Exam</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="border-border/80 bg-card/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-foreground">{exam.title}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {exam.description || 'No description provided yet.'}
                    </CardDescription>
                  </div>
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

              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>{exam.duration} minutes</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p>{formatDateTime(exam.start_time)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ends {formatDateTime(exam.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>Created {formatDateTime(exam.created_at)}</span>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href={`/dashboard/exams/${exam.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

function StudentDashboardView({ user }) {
  const [exams, setExams] = useState([]);
  const [fetchingExams, setFetchingExams] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    upcomingExams: 0,
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

        const now = new Date();
        const upcomingExams = availableExams.filter((exam) => {
          if (!exam.start_time) {
            return true;
          }
          return new Date(exam.start_time) > now;
        }).length;

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
          upcomingExams,
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
  }, []);

  return (
    <PortalShell
      title={`Welcome, ${user.name}`}
      description="Review upcoming assessments, track your performance, and launch exams from a clean secure workspace."
      contentClassName="mx-auto max-w-7xl"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Clock3} label="Upcoming Exams" value={summary.upcomingExams} tone="indigo" />
        <SummaryCard icon={CheckCircle2} label="Completed Exams" value={summary.completedExams} tone="emerald" />
        <SummaryCard icon={AlertTriangle} label="Violations / Warnings" value={summary.violations} tone="amber" />
        <SummaryCard icon={LineChart} label="Average Score" value={summary.averageScore} />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Available Exams</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Select a published exam below when you&apos;re ready to begin. Timers and anti-cheat checks start immediately after launch.
        </p>
      </div>

      {fetchingExams ? (
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-4 text-muted-foreground">Loading exams...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load exams</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : exams.length === 0 ? (
        <Card className="border-dashed border-border bg-card/70">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No published exams are available right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="border-border/80 bg-card/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader>
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <CardDescription>By {exam.lecturer?.name || 'Unknown'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock3 className="mr-2 h-4 w-4" />
                    Duration: {exam.duration} minutes
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Questions: {exam.question_count}
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/exam/${exam.id}`}>Start Exam</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
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
