'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowDownUp,
  BarChart3,
  Clock3,
  Search,
  Trophy,
  Users2,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(seconds) {
  if (seconds == null) {
    return '-';
  }

  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

function getScoreTone(score, totalPossibleScore) {
  const ratio = totalPossibleScore > 0 ? Number(score || 0) / totalPossibleScore : 0;

  if (ratio >= 0.75) {
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  }

  if (ratio >= 0.5) {
    return 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return 'text-rose-700 bg-rose-50 border-rose-200';
}

export default function LecturerExamResultsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [search, setSearch] = useState('');
  const [scoreSort, setScoreSort] = useState('desc');

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
    const loadResults = async () => {
      if (!examId || !token || !user || user.role !== 'lecturer') {
        return;
      }

      setLoadingData(true);
      setError('');

      try {
        const response = await fetch(`/api/exams/${examId}/results`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load exam results.');
        }

        setExam(data.exam);
        setRows(data.rows || []);
        setSelectedAttemptId(data.rows?.[0]?.id || null);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load exam results.');
      } finally {
        setLoadingData(false);
      }
    };

    loadResults();
  }, [examId, token, user]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const searched = query
      ? rows.filter((row) => row.studentName.toLowerCase().includes(query))
      : rows;

    return [...searched].sort((left, right) => {
      const delta = Number(left.score || 0) - Number(right.score || 0);

      if (delta !== 0) {
        return scoreSort === 'asc' ? delta : -delta;
      }

      return left.studentName.localeCompare(right.studentName);
    });
  }, [rows, scoreSort, search]);

  const selectedRow =
    filteredRows.find((row) => row.id === selectedAttemptId) ||
    filteredRows[0] ||
    null;

  const averageScore =
    filteredRows.length > 0
      ? (
          filteredRows.reduce((total, row) => total + Number(row.score || 0), 0) /
          filteredRows.length
        ).toFixed(1)
      : '0.0';
  const topScore =
    filteredRows.length > 0
      ? Math.max(...filteredRows.map((row) => Number(row.score || 0)))
      : 0;
  const totalPossibleScore = Number(exam?.totalPossibleScore || 0);

  if (loading || !user) {
    return <FullScreenLoader message="Checking your workspace..." />;
  }

  if (user.role !== 'lecturer') {
    return <FullScreenLoader message="Redirecting you to your dashboard..." />;
  }

  if (loadingData) {
    return <FullScreenLoader message="Loading exam analytics..." />;
  }

  return (
    <PortalShell
      title={exam?.title ? `${exam.title} Results` : 'Exam Results'}
      description="Review student performance, sort by score, and inspect per-question marking."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href={`/dashboard/exams/${examId}`}>Back to Exam</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
          </Button>
        </div>
      }
      contentClassName="mx-auto max-w-7xl"
    >
      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="p-6 text-sm text-rose-900">{error}</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Submissions</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{filteredRows.length}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      Students graded
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-3 text-white">
                    <Users2 className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Average Score</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">
                      {averageScore} / {exam?.totalPossibleScore || 0}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      Cohort mean
                    </p>
                  </div>
                  <div className="rounded-2xl bg-indigo-600 p-3 text-white">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Top Score</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">
                      {topScore} / {exam?.totalPossibleScore || 0}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      Best attempt
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-500 p-3 text-white">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)]">
            <CardHeader className="flex flex-col gap-4 border-b border-slate-200/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(59,130,246,0.06),rgba(99,102,241,0.06))] md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-slate-600" />
                  Lecturer Analytics
                </CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Search submissions, compare scores, and drill into question-level marking.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                <div className="relative min-w-[240px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student name"
                    className="h-11 rounded-xl border-slate-300 bg-white/80 pl-9 shadow-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-slate-300 bg-white"
                  onClick={() => setScoreSort((current) => (current === 'desc' ? 'asc' : 'desc'))}
                >
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  Score: {scoreSort === 'desc' ? 'High to Low' : 'Low to High'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="border-b border-slate-200/70 lg:border-b-0 lg:border-r">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Submission Type</TableHead>
                        <TableHead>Time Taken</TableHead>
                        <TableHead>Submitted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                            No submissions found for this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer border-slate-200/80"
                            data-state={selectedRow?.id === row.id ? 'selected' : undefined}
                            onClick={() => setSelectedAttemptId(row.id)}
                          >
                            <TableCell>
                              <div className="font-medium text-slate-900">{row.studentName}</div>
                              <div className="text-xs text-slate-500">{row.studentEmail}</div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreTone(
                                  row.score,
                                  totalPossibleScore
                                )}`}
                              >
                                {row.score} / {exam?.totalPossibleScore || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  row.submissionType === 'auto'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }
                              >
                                {row.submissionType}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDuration(row.timeTakenSeconds)}</TableCell>
                            <TableCell>{formatDateTime(row.endTime || row.submittedAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-slate-50/70">
                  {selectedRow ? (
                    <div className="space-y-6 p-6">
                      <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Selected Attempt
                            </p>
                            <h3 className="mt-3 text-xl font-semibold text-slate-950">
                              {selectedRow.studentName}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{selectedRow.studentEmail}</p>
                          </div>
                          <div
                            className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${getScoreTone(
                              selectedRow.score,
                              totalPossibleScore
                            )}`}
                          >
                            {selectedRow.score} / {exam?.totalPossibleScore || 0}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Clock3 className="h-4 w-4" />
                              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                                Time Taken
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-slate-900">
                              {formatDuration(selectedRow.timeTakenSeconds)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Submitted
                            </p>
                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                              {formatDateTime(selectedRow.endTime || selectedRow.submittedAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <p className="text-sm font-semibold text-slate-950">Question Breakdown</p>
                        <div className="mt-4 space-y-3">
                          {(selectedRow.questionResults || []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                              No per-question data is available for this submission yet.
                            </div>
                          ) : (
                            (selectedRow.questionResults || []).map((question) => (
                              <div
                                key={question.questionId}
                                className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-slate-900">
                                      Q{question.index}. {question.questionText}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {question.marks} mark(s)
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      question.isCorrect
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }
                                  >
                                    {question.isCorrect ? 'Correct' : 'Incorrect'}
                                  </Badge>
                                </div>
                                <div className="mt-4 grid gap-3">
                                  <div className="rounded-2xl bg-white p-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Student Answer
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                      {question.selectedAnswer || '-'}
                                    </p>
                                  </div>
                                  <div className="rounded-2xl bg-white p-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Correct Answer
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                      {question.correctAnswer}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[320px] items-center justify-center p-6">
                      <div className="max-w-sm rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
                        <p className="text-sm font-semibold text-slate-950">No attempt selected</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Choose a student submission from the table to inspect its full question breakdown.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
